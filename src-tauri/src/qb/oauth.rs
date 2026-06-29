//! Intuit OAuth2 with PKCE and localhost callback.

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use getrandom::getrandom;
use sha2::{Digest, Sha256};
use std::time::Duration;

use crate::keychain::{delete_secret, read_secret, write_secret};
use crate::qb::{oauth_authorize_url, oauth_token_url, QB_SERVICE};

const REDIRECT_URI: &str = "http://127.0.0.1:9876/callback";
const CALLBACK_PORT: u16 = 9876;
const SCOPES: &str = "com.intuit.quickbooks.accounting";

pub struct OAuthTokens {
    pub access_token: String,
    pub refresh_token: String,
    pub realm_id: String,
    pub expires_at: i64,
}

fn pkce_pair() -> (String, String) {
    let mut bytes = [0u8; 32];
    getrandom(&mut bytes).expect("OS random");
    let verifier = URL_SAFE_NO_PAD.encode(bytes);
    let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
    (verifier, challenge)
}

pub fn read_client_id() -> Result<String, String> {
    read_secret(QB_SERVICE, "client_id")?
        .value
        .ok_or_else(|| "QuickBooks Client ID not configured".to_string())
}

pub fn read_client_secret() -> Result<String, String> {
    read_secret(QB_SERVICE, "client_secret")?
        .value
        .ok_or_else(|| "QuickBooks Client Secret not configured".to_string())
}

pub async fn start_oauth_flow(environment: &str) -> Result<OAuthTokens, String> {
    let client_id = read_client_id()?;
    let (verifier, challenge) = pkce_pair();
    let state = uuid::Uuid::new_v4().to_string();

    let auth_url = format!(
        "{}?client_id={}&redirect_uri={}&response_type=code&scope={}&state={}&code_challenge={}&code_challenge_method=S256",
        oauth_authorize_url(environment),
        urlencoding::encode(&client_id),
        urlencoding::encode(REDIRECT_URI),
        urlencoding::encode(SCOPES),
        urlencoding::encode(&state),
        urlencoding::encode(&challenge),
    );

    let listener = tokio::net::TcpListener::bind(format!("127.0.0.1:{CALLBACK_PORT}"))
        .await
        .map_err(|e| format!("Failed to bind OAuth callback port: {e}"))?;

    open::that(&auth_url).map_err(|e| format!("Failed to open browser: {e}"))?;

    let (code, realm_id) = tokio::time::timeout(Duration::from_secs(120), wait_for_callback(listener, &state))
        .await
        .map_err(|_| "OAuth timed out waiting for browser callback".to_string())??;

    exchange_code(&client_id, &read_client_secret()?, &code, &verifier, &realm_id).await
}

async fn wait_for_callback(
    listener: tokio::net::TcpListener,
    expected_state: &str,
) -> Result<(String, String), String> {
    loop {
        let (mut stream, _) = listener
            .accept()
            .await
            .map_err(|e| format!("OAuth callback accept failed: {e}"))?;
        let mut buf = vec![0u8; 4096];
        let n = tokio::io::AsyncReadExt::read(&mut stream, &mut buf)
            .await
            .map_err(|e| e.to_string())?;
        let request = String::from_utf8_lossy(&buf[..n]);
        let first_line = request.lines().next().unwrap_or("");
        let path = first_line.split_whitespace().nth(1).unwrap_or("/");

        let response_ok = b"HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<html><body><h1>Mint connected to QuickBooks</h1><p>You can close this window.</p></body></html>";
        let _ = tokio::io::AsyncWriteExt::write_all(&mut stream, response_ok).await;

        if let Some(query) = path.split('?').nth(1) {
            let params: std::collections::HashMap<_, _> = url::form_urlencoded::parse(query.as_bytes())
                .into_owned()
                .collect();
            if params.get("state").map(String::as_str) != Some(expected_state) {
                continue;
            }
            if let Some(err) = params.get("error") {
                return Err(format!("OAuth error: {err}"));
            }
            let code = params
                .get("code")
                .ok_or_else(|| "Missing authorization code".to_string())?
                .clone();
            let realm_id = params.get("realmId").cloned().unwrap_or_default();
            return Ok((code, realm_id));
        }
    }
}

async fn exchange_code(
    client_id: &str,
    client_secret: &str,
    code: &str,
    verifier: &str,
    realm_id: &str,
) -> Result<OAuthTokens, String> {
    let client = reqwest::Client::new();
    let resp = client
        .post(oauth_token_url())
        .basic_auth(client_id, Some(client_secret))
        .header("Accept", "application/json")
        .form(&[
            ("grant_type", "authorization_code"),
            ("code", code),
            ("redirect_uri", REDIRECT_URI),
            ("code_verifier", verifier),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Token exchange failed: {body}"));
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let access_token = json["access_token"]
        .as_str()
        .ok_or("Missing access_token")?
        .to_string();
    let refresh_token = json["refresh_token"]
        .as_str()
        .ok_or("Missing refresh_token")?
        .to_string();
    let expires_in = json["expires_in"].as_i64().unwrap_or(3600);
    let expires_at = chrono::Utc::now().timestamp() + expires_in;

    store_tokens(&access_token, &refresh_token, realm_id, expires_at)?;

    Ok(OAuthTokens {
        access_token,
        refresh_token,
        realm_id: realm_id.to_string(),
        expires_at,
    })
}

pub fn store_tokens(
    access_token: &str,
    refresh_token: &str,
    realm_id: &str,
    expires_at: i64,
) -> Result<(), String> {
    write_secret(QB_SERVICE, "access_token", access_token)?;
    write_secret(QB_SERVICE, "refresh_token", refresh_token)?;
    write_secret(QB_SERVICE, "realm_id", realm_id)?;
    write_secret(QB_SERVICE, "token_expires_at", &expires_at.to_string())?;
    Ok(())
}

pub async fn refresh_access_token() -> Result<String, String> {
    let client_id = read_client_id()?;
    let client_secret = read_client_secret()?;
    let refresh_token = read_secret(QB_SERVICE, "refresh_token")?
        .value
        .ok_or_else(|| "Not connected to QuickBooks".to_string())?;

    let client = reqwest::Client::new();
    let resp = client
        .post(oauth_token_url())
        .basic_auth(&client_id, Some(&client_secret))
        .header("Accept", "application/json")
        .form(&[
            ("grant_type", "refresh_token"),
            ("refresh_token", refresh_token.as_str()),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Token refresh failed: {body}"));
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let access_token = json["access_token"]
        .as_str()
        .ok_or("Missing access_token")?
        .to_string();
    let new_refresh = json["refresh_token"]
        .as_str()
        .unwrap_or(&refresh_token)
        .to_string();
    let expires_in = json["expires_in"].as_i64().unwrap_or(3600);
    let expires_at = chrono::Utc::now().timestamp() + expires_in;
    let realm_id = read_secret(QB_SERVICE, "realm_id")?
        .value
        .unwrap_or_default();

    store_tokens(&access_token, &new_refresh, &realm_id, expires_at)?;
    Ok(access_token)
}

pub async fn get_valid_access_token() -> Result<String, String> {
    let expires_at: i64 = read_secret(QB_SERVICE, "token_expires_at")?
        .value
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);
    let now = chrono::Utc::now().timestamp();
    if now + 60 < expires_at {
        read_secret(QB_SERVICE, "access_token")?
            .value
            .ok_or_else(|| "Not connected to QuickBooks".to_string())
    } else {
        refresh_access_token().await
    }
}

pub fn disconnect() -> Result<(), String> {
    for key in [
        "access_token",
        "refresh_token",
        "realm_id",
        "token_expires_at",
    ] {
        let _ = delete_secret(QB_SERVICE, key);
    }
    Ok(())
}
