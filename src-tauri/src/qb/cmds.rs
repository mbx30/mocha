//! Tauri commands for QuickBooks Online.

use tauri::State;

use crate::db::Database;
use crate::keychain::{read_secret, write_secret};
use crate::qb::{self, oauth, QbConnectionPrefs, QB_PREF_CONNECTION, QB_SERVICE};

#[tauri::command]
pub fn qb_save_credentials(
    client_id: String,
    client_secret: String,
    environment: String,
) -> Result<(), String> {
    if client_id.trim().is_empty() || client_secret.trim().is_empty() {
        return Err("Client ID and secret are required".to_string());
    }
    write_secret(QB_SERVICE, "client_id", client_id.trim())?;
    write_secret(QB_SERVICE, "client_secret", client_secret.trim())?;
    write_secret(QB_SERVICE, "environment", &environment)?;
    Ok(())
}

#[derive(serde::Serialize)]
pub struct QbConnectionStatus {
    pub connected: bool,
    pub company_name: Option<String>,
    pub environment: String,
    pub has_credentials: bool,
}

#[tauri::command]
pub fn qb_connection_status(db: State<'_, Database>) -> Result<QbConnectionStatus, String> {
    let has_credentials = read_secret(QB_SERVICE, "client_id")?.exists
        && read_secret(QB_SERVICE, "client_secret")?.exists;
    let has_token = read_secret(QB_SERVICE, "access_token")?.exists;

    let prefs: QbConnectionPrefs = db
        .get_preference(QB_PREF_CONNECTION)
        .map_err(|e| e.to_string())?
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();

    let environment = read_secret(QB_SERVICE, "environment")?
        .value
        .unwrap_or_else(|| prefs.environment.clone());

    Ok(QbConnectionStatus {
        connected: has_token && prefs.connected,
        company_name: prefs.company_name,
        environment,
        has_credentials,
    })
}

#[tauri::command]
pub async fn qb_start_oauth(db: State<'_, Database>) -> Result<QbConnectionStatus, String> {
    let environment = read_secret(QB_SERVICE, "environment")?
        .value
        .unwrap_or_else(|| "sandbox".to_string());

    let tokens = oauth::start_oauth_flow(&environment).await?;

    let company_name =
        qb::api::fetch_company_name(&environment, &tokens.realm_id, &tokens.access_token).await?;

    let prefs = QbConnectionPrefs {
        connected: true,
        company_name: Some(company_name.clone()),
        environment: environment.clone(),
        connected_at: Some(chrono::Utc::now().to_rfc3339()),
    };
    db.set_preference(
        QB_PREF_CONNECTION,
        &serde_json::to_string(&prefs).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;

    Ok(QbConnectionStatus {
        connected: true,
        company_name: Some(company_name),
        environment,
        has_credentials: true,
    })
}

#[tauri::command]
pub fn qb_disconnect(db: State<'_, Database>) -> Result<(), String> {
    oauth::disconnect()?;
    let prefs = QbConnectionPrefs::default();
    db.set_preference(
        QB_PREF_CONNECTION,
        &serde_json::to_string(&prefs).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn sync_invoice_to_qb(
    db: State<'_, Database>,
    invoice_id: i64,
) -> Result<String, String> {
    let environment = read_secret(QB_SERVICE, "environment")?
        .value
        .unwrap_or_else(|| "sandbox".to_string());

    match qb::api::sync_invoice(&db, &environment, invoice_id).await {
        Ok(qb_id) => Ok(qb_id),
        Err(e) => {
            let _ = db.set_invoice_qb_error(invoice_id, &e);
            Err(e)
        }
    }
}
