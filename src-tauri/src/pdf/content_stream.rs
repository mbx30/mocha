use lopdf::Object;
use lopdf::Stream;
use flate2::read::ZlibDecoder;
use flate2::write::ZlibEncoder;
use flate2::Compression;
use std::io::{Read, Write};

#[derive(Debug, Clone)]
pub enum ContentToken {
    Operator(String),
    Operand(String),
    BeginMarkedContent { tag: String },
    EndMarkedContent,
    BeginImageData,
    EndImageData,
    Comment(String),
    Unknown(String),
}

pub fn decode_stream(stream: &Stream) -> Result<Vec<u8>, String> {
    let filters = stream.dict.get(b"Filter");
    match filters {
        Ok(Object::Name(name)) if name == b"FlateDecode" => {
            let mut d = ZlibDecoder::new(stream.content.as_slice());
            let mut buf = Vec::new();
            d.read_to_end(&mut buf).map_err(|e| format!("FlateDecode error: {e}"))?;
            Ok(buf)
        }
        Ok(Object::Array(arr)) => {
            let mut data = stream.content.clone();
            for filter_obj in arr.iter() {
                if let Object::Name(name) = filter_obj {
                    match name.as_slice() {
                        b"FlateDecode" | b"Fl" => {
                            let mut d = ZlibDecoder::new(data.as_slice());
                            let mut buf = Vec::new();
                            d.read_to_end(&mut buf).map_err(|e| format!("FlateDecode error: {e}"))?;
                            data = buf;
                        }
                        b"ASCII85Decode" | b"A85" => {
                            let decoded = ascii85_decode(&data)?;
                            data = decoded;
                        }
                        b"ASCIIHexDecode" | b"AHx" => {
                            let decoded = ascii_hex_decode(&data)?;
                            data = decoded;
                        }
                        other => {
                            let name_str = String::from_utf8_lossy(other);
                            return Err(format!("Unsupported filter: {name_str}"));
                        }
                    }
                }
            }
            Ok(data)
        }
        Ok(Object::Null) | Err(_) => Ok(stream.content.clone()),
        Ok(other) => {
            let s = format!("{:?}", other);
            return Err(format!("Unexpected Filter value: {s}"));
        }
    }
}

pub fn encode_stream(data: &[u8]) -> Stream {
    let mut encoder = ZlibEncoder::new(Vec::new(), Compression::default());
    encoder.write_all(data).unwrap();
    let compressed = encoder.finish().unwrap();
    Stream::new(
        lopdf::Dictionary::from_iter(vec![
            (b"Filter".to_vec(), Object::Name(b"FlateDecode".to_vec())),
        ]),
        compressed,
    )
}

pub fn tokenize_content(data: &[u8]) -> Vec<ContentToken> {
    let s = String::from_utf8_lossy(data);
    let mut tokens = Vec::new();
    let mut current = String::new();
    let mut in_hex_string = false;
    let mut hex_string_buf = String::new();
    let mut in_literal_string = false;
    let mut literal_string_buf = String::new();
    let mut in_comment = false;
    let mut comment_buf = String::new();

    for ch in s.chars() {
        if in_comment {
            if ch == '\n' || ch == '\r' {
                tokens.push(ContentToken::Comment(comment_buf.clone()));
                comment_buf.clear();
                in_comment = false;
            } else {
                comment_buf.push(ch);
            }
            continue;
        }
        if in_hex_string {
            if ch == '>' {
                in_hex_string = false;
                tokens.push(ContentToken::Operand(format!("<{hex_string_buf}>")));
                hex_string_buf.clear();
            } else if !ch.is_whitespace() {
                hex_string_buf.push(ch);
            }
            continue;
        }
        if in_literal_string {
            if ch == ')' {
                in_literal_string = false;
                tokens.push(ContentToken::Operand(format!("({literal_string_buf})")));
                literal_string_buf.clear();
            } else {
                literal_string_buf.push(ch);
            }
            continue;
        }
        if ch == '%' {
            if !current.is_empty() {
                tokens.push(ContentToken::Operand(current.clone()));
                current.clear();
            }
            in_comment = true;
            continue;
        }
        if ch == '(' {
            if !current.is_empty() {
                tokens.push(ContentToken::Operand(current.clone()));
                current.clear();
            }
            in_literal_string = true;
            literal_string_buf.clear();
            continue;
        }
        if ch == '<' {
            if !current.is_empty() {
                tokens.push(ContentToken::Operand(current.clone()));
                current.clear();
            }
            in_hex_string = true;
            hex_string_buf.clear();
            continue;
        }
        if ch == '/' {
            if !current.is_empty() {
                tokens.push(ContentToken::Operand(current.clone()));
                current.clear();
            }
            current.push(ch);
            continue;
        }
        if ch == '[' || ch == ']' || ch == '{' || ch == '}' {
            if !current.is_empty() {
                tokens.push(ContentToken::Operand(current.clone()));
                current.clear();
            }
            tokens.push(ContentToken::Operand(ch.to_string()));
            continue;
        }
        if ch.is_whitespace() {
            if !current.is_empty() {
                tokens.push(ContentToken::Operand(current.clone()));
                current.clear();
            }
        } else {
            current.push(ch);
        }
    }
    if !current.is_empty() {
        tokens.push(ContentToken::Operand(current));
    }

    let operators: std::collections::HashSet<&str> = [
        "b", "B", "b*", "B*", "BDC", "BMC", "BT", "BX", "c", "cm", "cs", "CS", "d", "d0", "d1",
        "Do", "DP", "EI", "EMC", "ET", "EX", "f", "F", "f*", "g", "G", "gs", "h", "i", "ID",
        "j", "J", "k", "K", "l", "m", "M", "MP", "n", "q", "Q", "re", "rg", "RG", "ri", "s",
        "S", "sc", "SC", "sh", "T*", "Tc", "Td", "TD", "Tf", "Tj", "TJ", "TL", "Tm", "Tr",
        "Ts", "Tw", "Tz", "v", "w", "W", "W*", "x", "y", "'", "\"",
    ].iter().copied().collect();

    let mut result = Vec::new();
    let mut i = 0;
    while i < tokens.len() {
        match tokens[i].clone() {
            ContentToken::Operand(ref s) if operators.contains(s.as_str()) => {
                result.push(ContentToken::Operator(s.clone()));
            }
            ContentToken::Operand(ref s) if s == "BMC" || s == "BDC" => {
                if i > 0 {
                    if let ContentToken::Operand(tag) = &tokens[i - 1] {
                        let tag_clean = tag.trim_start_matches('/');
                        result.push(ContentToken::BeginMarkedContent { tag: tag_clean.to_string() });
                    }
                }
            }
            ContentToken::Operand(ref s) if s == "EMC" => {
                result.push(ContentToken::EndMarkedContent);
            }
            ContentToken::Operand(ref s) if s == "BI" => {
                result.push(ContentToken::BeginImageData);
            }
            ContentToken::Operand(ref s) if s == "EI" => {
                result.push(ContentToken::EndImageData);
            }
            t => result.push(t),
        }
        i += 1;
    }
    result
}

fn ascii85_decode(data: &[u8]) -> Result<Vec<u8>, String> {
    let s = String::from_utf8_lossy(data);
    let mut result = Vec::new();
    let mut buf: [u8; 5] = [0u8; 5];
    let mut buf_len = 0;
    for ch in s.chars() {
        if ch.is_whitespace() { continue; }
        if ch == '~' { break; }
        if ch == 'z' {
            result.extend_from_slice(&[0, 0, 0, 0]);
            continue;
        }
        let val = (ch as u8).wrapping_sub(33);
        if val > 84 { return Err(format!("Invalid ASCII85 character: {ch}")); }
        buf[buf_len] = val;
        buf_len += 1;
        if buf_len == 5 {
            let mut code: u32 = 0;
            for j in 0..5 { code = code * 85 + buf[j] as u32; }
            result.extend_from_slice(&[
                (code >> 24) as u8,
                (code >> 16) as u8,
                (code >> 8) as u8,
                code as u8,
            ]);
            buf_len = 0;
        }
    }
    if buf_len > 1 {
        for j in buf_len..5 { buf[j] = 84; }
        let mut code: u32 = 0;
        for j in 0..5 { code = code * 85 + buf[j] as u32; }
        result.extend_from_slice(&[
            (code >> 24) as u8,
            (code >> 16) as u8,
            (code >> 8) as u8,
            code as u8,
        ]);
        result.truncate(result.len() - (5 - buf_len));
    }
    Ok(result)
}

fn ascii_hex_decode(data: &[u8]) -> Result<Vec<u8>, String> {
    let s = String::from_utf8_lossy(data);
    let hex_part: String = s.chars().filter(|c| !c.is_whitespace()).take_while(|c| *c != '>').collect();
    let bytes: Result<Vec<u8>, _> = (0..hex_part.len())
        .step_by(2)
        .map(|i| {
            let end = (i + 2).min(hex_part.len());
            let p = if end - i == 1 { format!("{}0", &hex_part[i..end]) } else { hex_part[i..end].to_string() };
            u8::from_str_radix(&p, 16).map_err(|e| format!("Hex decode error: {e}"))
        })
        .collect();
    bytes
}

pub fn renumber_content_stream(data: &[u8]) -> Vec<u8> {
    data.to_vec()
}
