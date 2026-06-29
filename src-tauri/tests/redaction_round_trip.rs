//! End-to-end redaction tests (#231).
//!
//! Builds a minimal PDF in memory, runs the redaction engine, and re-parses the
//! output to assert that an opaque black box was appended as a final content
//! stream, that the document stays valid, and that the coordinate transform and
//! audit hash behave as specified. These build against `app_lib`, so they run
//! in CI where the full Tauri toolchain (GTK) is available.

use app_lib::pdf::redact::{redact_pdf_content, verify_chain_link, RedactionRect};
use lopdf::{dictionary, Document, Object, Stream};

/// Build a one-page US-Letter PDF with a single line of text; return its bytes.
fn make_simple_pdf() -> Vec<u8> {
    let mut doc = Document::with_version("1.5");
    let pages_id = doc.new_object_id();
    let content = b"BT /F1 24 Tf 100 700 Td (SECRET TEXT) Tj ET".to_vec();
    let content_id = doc.add_object(Stream::new(dictionary! {}, content));
    let font_id = doc.add_object(dictionary! {
        "Type" => "Font", "Subtype" => "Type1", "BaseFont" => "Helvetica",
    });
    let resources_id = doc.add_object(dictionary! {
        "Font" => dictionary! { "F1" => font_id },
    });
    let page_id = doc.add_object(dictionary! {
        "Type" => "Page",
        "Parent" => pages_id,
        "Contents" => content_id,
        "Resources" => resources_id,
        "MediaBox" => vec![0.into(), 0.into(), 612.into(), 792.into()],
    });
    doc.objects.insert(
        pages_id,
        Object::Dictionary(dictionary! {
            "Type" => "Pages",
            "Kids" => vec![page_id.into()],
            "Count" => 1,
        }),
    );
    let catalog_id = doc.add_object(dictionary! {
        "Type" => "Catalog", "Pages" => pages_id,
    });
    doc.trailer.set("Root", catalog_id);
    let mut buf = Vec::new();
    doc.save_to(&mut buf).unwrap();
    buf
}

#[test]
fn redaction_appends_black_box_and_stays_parseable() {
    let input = make_simple_pdf();
    let out = std::env::temp_dir().join("mint_redact_rt_out.pdf");
    let out_str = out.to_str().unwrap();

    let redactions = vec![RedactionRect {
        page: 0,
        x: 100.0,
        y: 80.0, // top-left origin, near the top text line
        width: 150.0,
        height: 30.0,
    }];

    let result = redact_pdf_content(&input, &redactions, out_str).expect("redaction failed");
    assert_eq!(result.pages_modified, 1);
    assert_eq!(result.redactions_applied, 1);
    assert_eq!(result.content_hash.len(), 64);

    // Output re-parses as a valid PDF.
    let out_bytes = std::fs::read(out_str).unwrap();
    let reloaded = Document::load_mem(&out_bytes).expect("output is not a valid PDF");

    // Contents grew from a single ref to [original, redaction].
    let pages = reloaded.get_pages();
    let page_id = *pages.get(&1u32).unwrap();
    let page = reloaded.get_dictionary(page_id).unwrap();
    let refs: Vec<lopdf::ObjectId> = match page.get(b"Contents").unwrap() {
        Object::Array(a) => a.iter().filter_map(|o| o.as_reference().ok()).collect(),
        Object::Reference(r) => vec![*r],
        _ => panic!("unexpected Contents type"),
    };
    assert_eq!(
        refs.len(),
        2,
        "expected original + appended redaction stream"
    );

    // The appended (last) stream paints an opaque black box at the transformed
    // coordinates: y flip = 792 - 80 - 30 = 682.
    let last = reloaded.get_object(*refs.last().unwrap()).unwrap();
    let body = String::from_utf8_lossy(&last.as_stream().unwrap().content).to_string();
    assert!(body.contains("0 0 0 rg"), "missing black fill: {body}");
    assert!(body.contains("100 682 150 30 re"), "wrong coords: {body}");
    assert!(body.contains('f'), "missing fill op: {body}");

    let _ = std::fs::remove_file(out_str);
}

#[test]
fn redaction_targeting_missing_page_errors() {
    let input = make_simple_pdf();
    let out = std::env::temp_dir().join("mint_redact_missing.pdf");
    let redactions = vec![RedactionRect {
        page: 5, // only 1 page exists
        x: 10.0,
        y: 10.0,
        width: 10.0,
        height: 10.0,
    }];
    let err = redact_pdf_content(&input, &redactions, out.to_str().unwrap());
    assert!(err.is_err());
    assert!(err.unwrap_err().contains("page"));
}

#[test]
fn redaction_hash_is_deterministic_for_same_input() {
    let input = make_simple_pdf();
    let out1 = std::env::temp_dir().join("mint_redact_det1.pdf");
    let out2 = std::env::temp_dir().join("mint_redact_det2.pdf");
    let r = vec![RedactionRect {
        page: 0,
        x: 1.0,
        y: 1.0,
        width: 5.0,
        height: 5.0,
    }];
    let a = redact_pdf_content(&input, &r, out1.to_str().unwrap()).unwrap();
    let b = redact_pdf_content(&input, &r, out2.to_str().unwrap()).unwrap();
    assert_eq!(
        a.content_hash, b.content_hash,
        "same input must hash equally"
    );
    let _ = std::fs::remove_file(out1);
    let _ = std::fs::remove_file(out2);
}

#[test]
fn redaction_all_zero_area_regions_is_rejected() {
    let input = make_simple_pdf();
    let out = std::env::temp_dir().join("mint_redact_empty.pdf");
    let r = vec![RedactionRect {
        page: 0,
        x: 1.0,
        y: 1.0,
        width: 0.0,
        height: 10.0,
    }];
    let err = redact_pdf_content(&input, &r, out.to_str().unwrap());
    assert!(err.is_err(), "all-degenerate redactions must be rejected");
}

#[test]
fn audit_chain_link_logic_matches_expectations() {
    // Genesis and matching links are valid; tampered or malformed links are not.
    assert!(verify_chain_link(None, None));
    assert!(verify_chain_link(Some("a"), Some("a")));
    assert!(!verify_chain_link(Some("a"), Some("b")));
    assert!(!verify_chain_link(None, Some("a")));
    assert!(!verify_chain_link(Some("a"), None));
}
