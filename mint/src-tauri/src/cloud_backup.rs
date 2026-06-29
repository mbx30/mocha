use serde::{Deserialize, Serialize};

/// Stub for cloud backup — logs intent. The actual cloud endpoint is external.
#[derive(Debug, Serialize, Deserialize)]
pub struct EventBatch {
    pub tenant_id: String,
    pub events: Vec<crate::models::EventLogEntry>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SnapshotUpload {
    pub tenant_id: String,
    pub file_path: String,
    pub checksum: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupResult {
    pub success: bool,
    pub message: String,
}

/// Upload a batch of events to the cloud (stub).
pub async fn upload_event_batch(_batch: &EventBatch) -> Result<BackupResult, String> {
    log::info!(
        "[cloud_backup] Would upload {} events for tenant '{}'",
        _batch.events.len(),
        _batch.tenant_id
    );
    Ok(BackupResult {
        success: true,
        message: "Event batch logged (cloud upload stub)".into(),
    })
}

/// Upload a snapshot file to the cloud (stub).
pub async fn upload_snapshot(_snapshot: &SnapshotUpload) -> Result<BackupResult, String> {
    log::info!(
        "[cloud_backup] Would upload snapshot '{}' for tenant '{}'",
        _snapshot.file_path,
        _snapshot.tenant_id
    );
    Ok(BackupResult {
        success: true,
        message: "Snapshot upload logged (cloud upload stub)".into(),
    })
}

/// Get sync status (stub).
pub fn get_sync_status() -> String {
    "cloud_backup: stub active, no remote configured".into()
}
