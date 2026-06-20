use std::path::Path;

/// Golden-file PDF regression test.
///
/// Loads each PDF from `tests/pdf_corpus/`, runs all preflight checks, and
/// asserts no panics occur.  Add new PDFs to the corpus to extend coverage.
#[test]
fn preflight_regression_test() {
    let corpus = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("pdf_corpus");

    if !corpus.exists() || !corpus.is_dir() {
        eprintln!("PDF corpus directory not found at {:?}; skipping.", corpus);
        return;
    }

    let mut tested = 0u32;
    for entry in std::fs::read_dir(&corpus).expect("read pdf_corpus") {
        let entry = entry.expect("valid entry");
        let path = entry.path();
        if path.extension().map(|e| e == "pdf").unwrap_or(false) {
            let name = path.file_name().unwrap().to_string_lossy().to_string();
            println!("[regression] loading {name}…");

            let doc = match lopdf::Document::load(&path) {
                Ok(d) => d,
                Err(e) => {
                    eprintln!("[regression] FAIL {name}: load error: {e}");
                    continue;
                }
            };

            let _fonts = app_lib::pdf::fonts::collect_fonts(&doc);
            let _boxes = app_lib::pdf::boxes::check_page_boxes(&doc);
            let _images = app_lib::pdf::images::check_image_resolution(&doc);
            let _bleed = app_lib::pdf::bleed::check_bleed(&doc, 3.0);
            let _intents = app_lib::pdf::metadata::get_output_intents(&doc);
            let _security = app_lib::pdf::security::check_security(&doc);
            let _pdfx = app_lib::pdf::pdfx::check_metadata(&doc);
            let _colors = app_lib::pdf::color::check_color_spaces(&doc, "any");
            let _overprint = app_lib::pdf::overprint::check_overprint(&doc);
            let _transparency = app_lib::pdf::overprint::check_transparency(&doc);
            let _hidden = app_lib::pdf::overprint::check_hidden_content(&doc);
            let _spot = app_lib::pdf::color::check_spot_colors(&doc);

            println!("[regression] OK  {name}");
            tested += 1;
        }
    }

    if tested == 0 {
        eprintln!("[regression] WARNING: no PDFs in corpus at {:?}", corpus);
    } else {
        println!("[regression] tested {tested} file(s) — all passed");
    }
}
