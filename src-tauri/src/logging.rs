use std::path::PathBuf;
use tracing_subscriber::prelude::*;

/// Initialize structured logging with file rotation.
/// Logs go to {app_data_dir}/frappe.log with rotation.
pub fn init_logging(app_data_dir: &PathBuf) {
    let log_dir = app_data_dir.join("logs");
    std::fs::create_dir_all(&log_dir).ok();

    let file_appender = tracing_appender::rolling::daily(&log_dir, "frappe.log");
    let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::fmt::layer()
                .with_writer(non_blocking)
                .with_ansi(false)
                .with_target(true)
                .with_thread_ids(true),
        )
        .with(
            tracing_subscriber::fmt::layer()
                .with_writer(std::io::stdout)
                .with_ansi(true)
                .with_target(false),
        )
        .with(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    tracing::info!("structured logging initialized at {}/frappe.log", log_dir.display());
}

/// Returns the path to the log directory.
pub fn log_dir(app_data_dir: &PathBuf) -> PathBuf {
    app_data_dir.join("logs")
}

/// Stub: "Reveal logs" action — opens the log folder in the file manager.
pub fn reveal_logs(app_data_dir: &PathBuf) {
    let dir = log_dir(app_data_dir);
    if dir.exists() {
        if let Err(e) = open::that(&dir) {
            tracing::warn!("failed to open log dir: {e}");
        }
    }
}
