//! HTTP client for the Stirling PDF sidecar (Docker on :8080).
//! Mint calls these endpoints instead of maintaining a native PDF engine.

use reqwest::multipart::{Form, Part};
use std::path::{Path, PathBuf};
use std::process::Command;

const DEFAULT_STIRLING_URL: &str = "http://127.0.0.1:8080";

fn stirling_base() -> String {
    std::env::var("STIRLING_URL").unwrap_or_else(|_| DEFAULT_STIRLING_URL.to_string())
}

fn compose_file_path() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("src-tauri parent")
        .join("docker-compose.yml")
}

async fn get_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(300))
        .build()
        .map_err(|e| e.to_string())
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

    let bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("Failed to read Stirling response: {e}"))?;

    if let Some(parent) = Path::new(output_path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(output_path, &bytes).map_err(|e| e.to_string())?;
    Ok(output_path.to_string())
}

fn pdf_part(bytes: Vec<u8>, name: &str) -> Part {
    Part::bytes(bytes)
        .file_name(name.to_string())
        .mime_str("application/pdf")
        .expect("application/pdf mime")
}

/// Returns true when the Stirling sidecar responds on `/api/v1/info/status`.
#[tauri::command]
pub async fn stirling_health() -> bool {
    let url = format!("{}/api/v1/info/status", stirling_base());
    match get_client().await {
        Ok(client) => client
            .get(&url)
            .send()
            .await
            .map(|r| r.status().is_success())
            .unwrap_or(false),
        Err(_) => false,
    }
}

/// Runs `docker compose up -d` against the repo's `docker-compose.yml`.
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
        .args(["up", "-d"])
        .current_dir(compose_dir)
        .output()
        .map_err(|e| format!("Failed to run docker compose: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        return Err(format!("docker compose failed:\n{stdout}\n{stderr}"));
    }

    // Poll health for up to 60s while the container boots.
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
    let bytes = std::fs::read(&input_path).map_err(|e| e.to_string())?;
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
        let bytes = std::fs::read(path).map_err(|e| e.to_string())?;
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
        let bytes = std::fs::read(path).map_err(|e| e.to_string())?;
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
    let bytes = std::fs::read(&input_path).map_err(|e| e.to_string())?;
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

    let bytes = std::fs::read(&input_path).map_err(|e| e.to_string())?;
    let form = Form::new()
        .part("fileInput", pdf_part(bytes, "in.pdf"))
        .text("angle", angle.to_string());

    post_and_save("/api/v1/general/rotate-pdf", form, &output_path).await
}

/// Lossy compress to reduce file size.
#[tauri::command]
pub async fn pdf_compress(input_path: String, output_path: String) -> Result<String, String> {
    let bytes = std::fs::read(&input_path).map_err(|e| e.to_string())?;
    let form = Form::new().part("fileInput", pdf_part(bytes, "in.pdf"));

    post_and_save("/api/v1/misc/compress-pdf", form, &output_path).await
}

/// Add a text stamp overlay (crop marks, proof labels, etc.).
#[tauri::command]
pub async fn pdf_add_stamp(
    input_path: String,
    stamp_text: String,
    output_path: String,
) -> Result<String, String> {
    let bytes = std::fs::read(&input_path).map_err(|e| e.to_string())?;
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
    let bytes = std::fs::read(&input_path).map_err(|e| e.to_string())?;
    let form = Form::new()
        .part("fileInput", pdf_part(bytes, "in.pdf"))
        .text("customPageOrder", page_order);

    post_and_save("/api/v1/general/rearrange-pages", form, &output_path).await
}
