//! HTTP client for the Stirling PDF sidecar (Docker on :8080).
//! Mint calls these endpoints instead of maintaining a native PDF engine.

use crate::security;
use reqwest::multipart::{Form, Part};
use std::path::{Path, PathBuf};
use std::process::Command;

const DEFAULT_STIRLING_URL: &str = "http://127.0.0.1:8080";

#[derive(serde::Serialize)]
pub struct StirlingInfo {
    pub online: bool,
    pub version: Option<String>,
}

fn stirling_base() -> String {
    std::env::var("STIRLING_URL").unwrap_or_else(|_| DEFAULT_STIRLING_URL.to_string())
}

/// Resolve docker-compose.yml: monorepo root first, then mint-local fallback.
fn compose_file_path() -> PathBuf {
    if let Ok(root) = std::env::var("MOCHA_MERGE_ROOT") {
        let p = PathBuf::from(&root).join("docker-compose.yml");
        if p.exists() {
            return p;
        }
    }

    let mint_root = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("src-tauri parent");

    if let Some(merge_root) = mint_root.parent() {
        let merge_compose = merge_root.join("docker-compose.yml");
        if merge_compose.exists() {
            return merge_compose;
        }
    }

    mint_root.join("docker-compose.yml")
}

async fn get_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(300))
        .build()
        .map_err(|e| e.to_string())
}

fn ensure_output_path(output_path: &str, default_ext: &str) -> Result<String, String> {
    let validated = security::validate_write_path(output_path).map_err(|e| e.to_string())?;
    let path_str = validated.to_string_lossy().into_owned();
    let path = Path::new(&path_str);
    if path.extension().is_none() {
        return Ok(format!("{path_str}.{default_ext}"));
    }
    Ok(path_str)
}

async fn post_and_save(
    endpoint: &str,
    form: Form,
    output_path: &str,
) -> Result<String, String> {
    let url = format!("{}{}", stirling_base(), endpoint);
    let client = get_client().await?;
    let resp = client
        .post(&url)
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Stirling request failed: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Stirling returned {status}: {body}"));
    }

    let content_type = resp
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_lowercase();

    let default_ext = if content_type.contains("zip") {
        "zip"
    } else {
        "pdf"
    };
    let final_path = ensure_output_path(output_path, default_ext)?;

    let bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("Failed to read Stirling response: {e}"))?;

    if let Some(parent) = Path::new(&final_path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&final_path, &bytes).map_err(|e| e.to_string())?;
    Ok(final_path)
}

fn pdf_part(bytes: Vec<u8>, name: &str) -> Part {
    Part::bytes(bytes)
        .file_name(name.to_string())
        .mime_str("application/pdf")
        .expect("application/pdf mime")
}

fn read_pdf_input(input_path: &str) -> Result<Vec<u8>, String> {
    let path = security::validate_read_path(input_path).map_err(|e| e.to_string())?;
    std::fs::read(path).map_err(|e| e.to_string())
}

/// Returns true when the Stirling sidecar responds on `/api/v1/info/status`.
#[tauri::command]
pub async fn stirling_health() -> bool {
    stirling_info().await.online
}

/// Stirling connectivity and version string when online.
#[tauri::command]
pub async fn stirling_info() -> StirlingInfo {
    let url = format!("{}/api/v1/info/status", stirling_base());
    match get_client().await {
        Ok(client) => match client.get(&url).send().await {
            Ok(resp) if resp.status().is_success() => {
                let version = resp
                    .json::<serde_json::Value>()
                    .await
                    .ok()
                    .and_then(|v| {
                        v.get("version")
                            .or_else(|| v.get("appVersion"))
                            .and_then(|x| x.as_str())
                            .map(|s| s.to_string())
                    });
                StirlingInfo {
                    online: true,
                    version,
                }
            }
            _ => StirlingInfo {
                online: false,
                version: None,
            },
        },
        Err(_) => StirlingInfo {
            online: false,
            version: None,
        },
    }
}

/// Runs `docker compose up -d` against the monorepo or mint `docker-compose.yml`.
#[tauri::command]
pub async fn stirling_start() -> Result<String, String> {
    let compose = compose_file_path();
    if !compose.exists() {
        return Err(format!(
            "docker-compose.yml not found at {}",
            compose.display()
        ));
    }

    let compose_dir = compose
        .parent()
        .ok_or_else(|| "Invalid compose path".to_string())?;

    let output = Command::new("docker")
        .args(["compose", "-f"])
        .arg(&compose)
        .args(["up", "-d", "--build"])
        .current_dir(compose_dir)
        .output()
        .map_err(|e| format!("Failed to run docker compose: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        return Err(format!("docker compose failed:\n{stdout}\n{stderr}"));
    }

    for _ in 0..30 {
        if stirling_health().await {
            return Ok("Stirling PDF service is running".to_string());
        }
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    }

    Err("Docker started but Stirling did not become healthy within 60s".to_string())
}

/// Convert a PDF to PNG page images (returns a ZIP when multiple pages).
#[tauri::command]
pub async fn pdf_to_images(input_path: String, output_path: String) -> Result<String, String> {
    let bytes = read_pdf_input(&input_path)?;
    let form = Form::new()
        .part("fileInput", pdf_part(bytes, "in.pdf"))
        .text("imageFormat", "png")
        .text("singleOrMultiple", "multiple")
        .text("colorType", "color")
        .text("dpi", "300")
        .text("pageNumbers", "all");

    post_and_save("/api/v1/convert/pdf/img", form, &output_path).await
}

/// Convert one or more images into a single PDF.
#[tauri::command]
pub async fn images_to_pdf(input_paths: Vec<String>, output_path: String) -> Result<String, String> {
    let mut form = Form::new();
    for (i, path) in input_paths.iter().enumerate() {
        let validated = security::validate_read_path(path).map_err(|e| e.to_string())?;
        let bytes = std::fs::read(&validated).map_err(|e| e.to_string())?;
        let ext = Path::new(path)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("png");
        let mime = match ext.to_lowercase().as_str() {
            "jpg" | "jpeg" => "image/jpeg",
            "webp" => "image/webp",
            "gif" => "image/gif",
            _ => "image/png",
        };
        let part = Part::bytes(bytes)
            .file_name(format!("page_{i}.{ext}"))
            .mime_str(mime)
            .map_err(|e| e.to_string())?;
        form = form.part("fileInput", part);
    }

    post_and_save("/api/v1/convert/img/pdf", form, &output_path).await
}

/// Merge multiple PDFs into one file (order matches `input_paths`).
#[tauri::command]
pub async fn pdf_merge(input_paths: Vec<String>, output_path: String) -> Result<String, String> {
    if input_paths.len() < 2 {
        return Err("Merge requires at least two PDF files".to_string());
    }

    let mut form = Form::new();
    for (i, path) in input_paths.iter().enumerate() {
        let bytes = read_pdf_input(path)?;
        form = form.part("fileInput", pdf_part(bytes, &format!("doc_{i}.pdf")));
    }

    post_and_save("/api/v1/general/merge-pdfs", form, &output_path).await
}

/// Split a PDF at the given page numbers (comma-separated, e.g. "3,7").
#[tauri::command]
pub async fn pdf_split(
    input_path: String,
    page_numbers: String,
    output_path: String,
) -> Result<String, String> {
    let bytes = read_pdf_input(&input_path)?;
    let form = Form::new()
        .part("fileInput", pdf_part(bytes, "in.pdf"))
        .text("pageNumbers", page_numbers);

    post_and_save("/api/v1/general/split-pages", form, &output_path).await
}

/// Rotate all pages by 90, 180, or 270 degrees.
#[tauri::command]
pub async fn pdf_rotate(
    input_path: String,
    angle: u16,
    output_path: String,
) -> Result<String, String> {
    if ![90, 180, 270].contains(&angle) {
        return Err("Angle must be 90, 180, or 270".to_string());
    }

    let bytes = read_pdf_input(&input_path)?;
    let form = Form::new()
        .part("fileInput", pdf_part(bytes, "in.pdf"))
        .text("angle", angle.to_string());

    post_and_save("/api/v1/general/rotate-pdf", form, &output_path).await
}

/// Lossy compress to reduce file size.
#[tauri::command]
pub async fn pdf_compress(input_path: String, output_path: String) -> Result<String, String> {
    let bytes = read_pdf_input(&input_path)?;
    let form = Form::new().part("fileInput", pdf_part(bytes, "in.pdf"));

    post_and_save("/api/v1/misc/compress-pdf", form, &output_path).await
}

/// Add bleed and optional crop marks via Stirling print-preflight (PDFBox).
#[tauri::command]
pub async fn pdf_print_preflight(
    input_path: String,
    output_path: String,
    bleed_size_inches: Option<f32>,
    add_crop_marks: Option<bool>,
) -> Result<String, String> {
    let bytes = read_pdf_input(&input_path)?;
    let bleed = bleed_size_inches.unwrap_or(0.125);
    let crop = add_crop_marks.unwrap_or(true);
    let form = Form::new()
        .part("fileInput", pdf_part(bytes, "in.pdf"))
        .text("bleedSizeInches", bleed.to_string())
        .text("addCropMarks", crop.to_string());

    post_and_save("/api/v1/general/print-preflight", form, &output_path).await
}

/// Add a text stamp overlay (crop marks, proof labels, etc.).
#[tauri::command]
pub async fn pdf_add_stamp(
    input_path: String,
    stamp_text: String,
    output_path: String,
) -> Result<String, String> {
    let bytes = read_pdf_input(&input_path)?;
    let form = Form::new()
        .part("fileInput", pdf_part(bytes, "in.pdf"))
        .text("stampText", stamp_text)
        .text("fontSize", "12")
        .text("rotation", "0");

    post_and_save("/api/v1/security/add-stamp", form, &output_path).await
}

/// Reorder pages. `page_order` is comma-separated 1-based indices (e.g. "2,1,3").
#[tauri::command]
pub async fn pdf_rearrange_pages(
    input_path: String,
    page_order: String,
    output_path: String,
) -> Result<String, String> {
    let bytes = read_pdf_input(&input_path)?;
    let form = Form::new()
        .part("fileInput", pdf_part(bytes, "in.pdf"))
        .text("customPageOrder", page_order);

    post_and_save("/api/v1/general/rearrange-pages", form, &output_path).await
}
