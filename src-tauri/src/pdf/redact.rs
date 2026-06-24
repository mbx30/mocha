//! PDF redaction engine (#231).
//!
//! Redaction permanently obscures a rectangular region of a page by painting
//! an opaque black box over it. The box is emitted as an *additional* content
//! stream appended to the end of the page's `Contents` array, so under the PDF
//! painter's model it is drawn last and therefore on top of everything beneath
//! it. The original content streams are left untouched, which keeps the rest of
//! the page (and any PDF/X metadata, boxes, and output intents) intact.
//!
//! Coordinate contract: the frontend supplies each [`RedactionRect`] in **PDF
//! points with a top-left origin** (y grows downward from the top of the page,
//! matching how a rendered viewer reports a drag rectangle). The backend reads
//! the page `MediaBox` and converts to PDF user space (origin bottom-left, y
//! grows upward) — see [`transform_rect`]. Keeping the transform in the backend
//! makes it unit-testable and independent of the viewer's zoom/scroll state.
//!
//! Security: the whole pipeline runs in memory. The input is read into a
//! `Vec<u8>`, modified, serialized back into a `Vec<u8>`, hashed, and only then
//! written to the output path. No intermediate plaintext temp file is created.
//!
//! Compliance: [`sha256_hex`] of the serialized output PDF is returned so the
//! caller can persist it as a link in the redaction audit hash-chain.

use lopdf::{Dictionary, Document, Object, Stream};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

/// A single redaction rectangle supplied by the frontend.
///
/// `page` is the 0-based page index. `x`/`y`/`width`/`height` are in PDF points
/// with a **top-left origin** (y measured downward from the top of the page).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RedactionRect {
    pub page: usize,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

/// Outcome of a redaction run over a single PDF.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedactionResult {
    pub output_path: String,
    pub pages_modified: u32,
    pub redactions_applied: u32,
    /// SHA-256 (lowercase hex) of the serialized output PDF. Used as the audit
    /// hash-chain link for this operation.
    pub content_hash: String,
}

/// Compute the lowercase hex SHA-256 of `data`.
pub fn sha256_hex(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    let digest = hasher.finalize();
    digest.iter().map(|b| format!("{:02x}", b)).collect()
}

/// Verify a single link in the redaction hash-chain: `current.previous_hash`
/// must equal the prior operation's `content_hash`. The first operation in a
/// chain has `previous_hash == None`, which is only valid when there is no
/// prior operation (`prev_content_hash == None`).
pub fn verify_chain_link(
    prev_content_hash: Option<&str>,
    current_previous_hash: Option<&str>,
) -> bool {
    match (prev_content_hash, current_previous_hash) {
        (None, None) => true,
        (Some(prev), Some(cur)) => prev == cur,
        _ => false,
    }
}

/// A redaction is meaningful only if it has positive area.
fn is_valid_rect(rect: &RedactionRect) -> bool {
    rect.width > 0.0 && rect.height > 0.0
}

/// Drop zero-area (degenerate) redactions; they would emit an empty `re`
/// operator that paints nothing.
pub fn filter_valid_redactions(redactions: &[RedactionRect]) -> Vec<RedactionRect> {
    redactions
        .iter()
        .filter(|r| is_valid_rect(r))
        .cloned()
        .collect()
}

/// Format a PDF number: fixed notation, no scientific form, trailing zeros
/// trimmed. PDF content streams do not accept exponent notation.
fn fmt_num(n: f64) -> String {
    let s = format!("{:.4}", n);
    let trimmed = s.trim_end_matches('0').trim_end_matches('.');
    if trimmed.is_empty() || trimmed == "-0" {
        "0".to_string()
    } else {
        trimmed.to_string()
    }
}

/// Emit the graphics operators for one opaque black rectangle in PDF user-space
/// coordinates. The op sequence is wrapped in `q`/`Q` so it cannot leak fill
/// colour or other graphics state into anything drawn afterward.
fn rect_operators(x: f64, y: f64, w: f64, h: f64) -> String {
    format!(
        "q\n0 0 0 rg\n{} {} {} {} re\nf\nQ\n",
        fmt_num(x),
        fmt_num(y),
        fmt_num(w),
        fmt_num(h)
    )
}

/// Transform a top-left-origin rectangle (PDF points) into a PDF user-space
/// rectangle (origin bottom-left). `media_box` is `(x0, y0, x1, y1)`.
///
/// Returns `(x, y, w, h)` for the `re` operator, where `(x, y)` is the
/// bottom-left corner in user space.
pub fn transform_rect(
    rect: &RedactionRect,
    media_box: (f64, f64, f64, f64),
) -> (f64, f64, f64, f64) {
    let (x0, _y0, _x1, y1) = media_box;
    let user_x = x0 + rect.x;
    // Top edge in user space is y1 - rect.y; the bottom edge is that minus the
    // rectangle height.
    let user_y = y1 - rect.y - rect.height;
    (user_x, user_y, rect.width, rect.height)
}

/// Build the full content-stream byte payload for every redaction on one page.
/// A leading `q` / trailing `Q` brackets the whole batch so it is isolated from
/// any unbalanced (but spec-conformant) leftover state of preceding streams.
pub fn build_page_redaction_stream(
    rects: &[RedactionRect],
    media_box: (f64, f64, f64, f64),
) -> Vec<u8> {
    let mut out = String::from("q\n");
    for rect in rects {
        let (x, y, w, h) = transform_rect(rect, media_box);
        out.push_str(&rect_operators(x, y, w, h));
    }
    out.push_str("Q\n");
    out.into_bytes()
}

fn obj_to_f64(o: &Object) -> Option<f64> {
    match o {
        Object::Integer(i) => Some(*i as f64),
        Object::Real(r) => Some(*r as f64),
        _ => None,
    }
}

/// Read a page's `MediaBox` as `(x0, y0, x1, y1)`, walking up the `Parent`
/// chain since `MediaBox` is an inheritable page attribute. Falls back to US
/// Letter (612 x 792) when none is found, so a malformed page still redacts
/// against a sane default rather than failing outright.
fn get_media_box(doc: &Document, page_id: (u32, u16)) -> (f64, f64, f64, f64) {
    const DEFAULT: (f64, f64, f64, f64) = (0.0, 0.0, 612.0, 792.0);

    fn read_box(doc: &Document, dict: &Dictionary) -> Option<(f64, f64, f64, f64)> {
        let obj = dict.get(b"MediaBox").ok()?;
        let arr = match obj {
            Object::Reference(id) => doc.get_object(*id).ok()?.as_array().ok()?.clone(),
            other => other.as_array().ok()?.clone(),
        };
        if arr.len() != 4 {
            return None;
        }
        let x0 = obj_to_f64(&arr[0])?;
        let y0 = obj_to_f64(&arr[1])?;
        let x1 = obj_to_f64(&arr[2])?;
        let y1 = obj_to_f64(&arr[3])?;
        // Normalize so x0<=x1 and y0<=y1 regardless of how the array was written.
        Some((x0.min(x1), y0.min(y1), x0.max(x1), y0.max(y1)))
    }

    let mut current = page_id;
    // Bound the walk to avoid cycles in a malformed Parent chain.
    for _ in 0..32 {
        let dict = match doc.get_dictionary(current) {
            Ok(d) => d,
            Err(_) => break,
        };
        if let Some(b) = read_box(doc, dict) {
            return b;
        }
        match dict.get(b"Parent").ok().and_then(|o| o.as_reference().ok()) {
            Some(parent) => current = parent,
            None => break,
        }
    }
    DEFAULT
}

/// Append a new content stream object to a page's `Contents`, normalizing a
/// single reference into an array when necessary so the redaction stream is the
/// last one concatenated (and therefore painted on top).
fn append_content_stream(
    doc: &mut Document,
    page_id: (u32, u16),
    new_stream_id: (u32, u16),
) -> Result<(), String> {
    // Read the existing Contents (cloned) before taking a mutable borrow.
    let existing = doc
        .get_dictionary(page_id)
        .map_err(|e| format!("Page {:?} has no dictionary: {e}", page_id))?
        .get(b"Contents")
        .ok()
        .cloned();

    let new_contents = match existing {
        Some(Object::Reference(r)) => {
            Object::Array(vec![Object::Reference(r), Object::Reference(new_stream_id)])
        }
        Some(Object::Array(mut arr)) => {
            arr.push(Object::Reference(new_stream_id));
            Object::Array(arr)
        }
        _ => Object::Array(vec![Object::Reference(new_stream_id)]),
    };

    let page_dict = doc
        .get_object_mut(page_id)
        .map_err(|e| format!("Cannot mutate page {:?}: {e}", page_id))?
        .as_dict_mut()
        .map_err(|e| format!("Page {:?} object is not a dictionary: {e}", page_id))?;
    page_dict.set("Contents", new_contents);
    Ok(())
}

/// Core redaction routine. Loads the PDF from `input` bytes, paints an opaque
/// black box over every (valid) redaction rectangle, serializes the result to
/// `output_path`, and returns a [`RedactionResult`] including the SHA-256 of
/// the output for the audit hash-chain.
pub fn redact_pdf_content(
    input: &[u8],
    redactions: &[RedactionRect],
    output_path: &str,
) -> Result<RedactionResult, String> {
    let valid = filter_valid_redactions(redactions);
    if valid.is_empty() {
        return Err("No valid redaction regions provided".to_string());
    }

    let mut doc = Document::load_mem(input).map_err(|e| format!("Failed to parse PDF: {e}"))?;

    // page index (0-based) -> page object id. lopdf keys pages 1-based.
    let pages = doc.get_pages();

    // Group redactions by page so each page gets a single appended stream.
    let mut by_page: std::collections::BTreeMap<usize, Vec<RedactionRect>> =
        std::collections::BTreeMap::new();
    for r in valid {
        by_page.entry(r.page).or_default().push(r);
    }

    let mut pages_modified = 0u32;
    let mut redactions_applied = 0u32;

    for (page_index, rects) in by_page {
        let page_key = (page_index as u32) + 1;
        let page_id = match pages.get(&page_key) {
            Some(id) => *id,
            None => {
                return Err(format!(
                    "Redaction targets page {} but the document has {} page(s)",
                    page_index + 1,
                    pages.len()
                ))
            }
        };

        let media_box = get_media_box(&doc, page_id);
        let stream_bytes = build_page_redaction_stream(&rects, media_box);

        // Store the redaction stream uncompressed (no Filter). It is tiny, and
        // leaving it raw keeps the appended object trivially verifiable; the
        // compression pass can FlateDecode it later if desired.
        let stream = Stream::new(Dictionary::new(), stream_bytes);
        let new_stream_id = doc.add_object(Object::Stream(stream));

        append_content_stream(&mut doc, page_id, new_stream_id)?;

        pages_modified += 1;
        redactions_applied += rects.len() as u32;
    }

    // Serialize to memory first so we can hash the exact output bytes before
    // they touch disk (in-memory pipeline, deterministic audit hash).
    let mut buffer: Vec<u8> = Vec::new();
    doc.save_to(&mut buffer)
        .map_err(|e| format!("Failed to serialize redacted PDF: {e}"))?;

    let content_hash = sha256_hex(&buffer);

    std::fs::write(output_path, &buffer)
        .map_err(|e| format!("Failed to write redacted PDF: {e}"))?;

    Ok(RedactionResult {
        output_path: output_path.to_string(),
        pages_modified,
        redactions_applied,
        content_hash,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rect(page: usize, x: f64, y: f64, w: f64, h: f64) -> RedactionRect {
        RedactionRect {
            page,
            x,
            y,
            width: w,
            height: h,
        }
    }

    #[test]
    fn fmt_num_trims_and_avoids_scientific() {
        assert_eq!(fmt_num(100.0), "100");
        assert_eq!(fmt_num(100.5), "100.5");
        assert_eq!(fmt_num(0.0), "0");
        assert_eq!(fmt_num(-0.0), "0");
        // No exponent notation for small/large magnitudes.
        assert!(!fmt_num(0.0001).contains('e'));
        assert!(!fmt_num(1234567.0).contains('e'));
    }

    #[test]
    fn transform_rect_flips_y_axis() {
        // US Letter, top-left rect at (100, 200) sized 150x30.
        let media = (0.0, 0.0, 612.0, 792.0);
        let (x, y, w, h) = transform_rect(&rect(0, 100.0, 200.0, 150.0, 30.0), media);
        assert_eq!(x, 100.0);
        // bottom edge = 792 - 200 - 30 = 562
        assert_eq!(y, 562.0);
        assert_eq!(w, 150.0);
        assert_eq!(h, 30.0);
    }

    #[test]
    fn transform_rect_honors_media_box_origin() {
        // MediaBox not anchored at origin: offset must be added/respected.
        let media = (10.0, 20.0, 110.0, 220.0); // 100 x 200 page
        let (x, y, _w, _h) = transform_rect(&rect(0, 5.0, 5.0, 10.0, 10.0), media);
        assert_eq!(x, 15.0); // 10 + 5
        assert_eq!(y, 205.0); // 220 - 5 - 10
    }

    #[test]
    fn rect_operators_contains_expected_tokens() {
        let ops = rect_operators(100.0, 200.0, 50.0, 30.0);
        assert!(ops.contains("0 0 0 rg")); // black fill
        assert!(ops.contains("100 200 50 30 re")); // rectangle path
        assert!(ops.contains("f")); // fill
        assert!(ops.starts_with("q\n")); // saved state
        assert!(ops.trim_end().ends_with('Q')); // restored state
    }

    #[test]
    fn build_page_redaction_stream_brackets_all_rects() {
        let media = (0.0, 0.0, 612.0, 792.0);
        let rects = vec![
            rect(0, 10.0, 10.0, 20.0, 20.0),
            rect(0, 50.0, 50.0, 20.0, 20.0),
        ];
        let bytes = build_page_redaction_stream(&rects, media);
        let s = String::from_utf8(bytes).unwrap();
        assert!(s.starts_with("q\n"));
        assert!(s.trim_end().ends_with('Q'));
        // Two fill operations, one per rect.
        assert_eq!(s.matches(" re\n").count(), 2);
    }

    #[test]
    fn filter_valid_redactions_drops_zero_area() {
        let rects = vec![
            rect(0, 10.0, 10.0, 50.0, 0.0),  // zero height
            rect(0, 10.0, 10.0, 0.0, 50.0),  // zero width
            rect(0, 10.0, 10.0, 50.0, 50.0), // valid
        ];
        let kept = filter_valid_redactions(&rects);
        assert_eq!(kept.len(), 1);
        assert_eq!(kept[0].width, 50.0);
        assert_eq!(kept[0].height, 50.0);
    }

    #[test]
    fn sha256_hex_is_stable_and_lowercase() {
        let h = sha256_hex(b"frappe");
        assert_eq!(h.len(), 64);
        assert!(h
            .chars()
            .all(|c| c.is_ascii_hexdigit() && !c.is_ascii_uppercase()));
        // Same input -> same hash.
        assert_eq!(h, sha256_hex(b"frappe"));
        // Different input -> different hash.
        assert_ne!(h, sha256_hex(b"frappe2"));
    }

    #[test]
    fn verify_chain_link_accepts_genesis_and_matching_links() {
        // Genesis: no prior op, no previous_hash.
        assert!(verify_chain_link(None, None));
        // Matching link.
        assert!(verify_chain_link(Some("abc"), Some("abc")));
    }

    #[test]
    fn verify_chain_link_detects_tampering_and_broken_genesis() {
        // Mismatched link -> tampering.
        assert!(!verify_chain_link(Some("abc"), Some("xyz")));
        // A non-genesis op that claims no previous hash.
        assert!(!verify_chain_link(Some("abc"), None));
        // A genesis op that claims a previous hash.
        assert!(!verify_chain_link(None, Some("abc")));
    }

    #[test]
    fn redact_empty_input_is_rejected() {
        let err = redact_pdf_content(b"%PDF-1.4", &[], "/tmp/should_not_write.pdf");
        assert!(err.is_err());
    }
}
