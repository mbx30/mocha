//! QuickBooks Online REST API client.

use crate::models::{Client, InvoiceData};
use crate::qb::{api_base, oauth};

pub async fn fetch_company_name(environment: &str, realm_id: &str, token: &str) -> Result<String, String> {
    let url = format!(
        "{}/v3/company/{}/companyinfo/{}",
        api_base(environment),
        realm_id,
        realm_id
    );
    let client = reqwest::Client::new();
    let resp = client
        .get(&url)
        .bearer_auth(token)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("Company info failed: {}", resp.status()));
    }
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    Ok(json["CompanyInfo"]["CompanyName"]
        .as_str()
        .unwrap_or("QuickBooks Company")
        .to_string())
}

pub async fn find_or_create_customer(
    environment: &str,
    realm_id: &str,
    token: &str,
    client: &Client,
) -> Result<String, String> {
    if let Some(ref id) = client.qb_customer_id {
        if !id.is_empty() {
            return Ok(id.clone());
        }
    }

    let display = if !client.company.is_empty() {
        client.company.clone()
    } else {
        client.name.clone()
    };

    let query = format!(
        "select * from Customer where DisplayName = '{}'",
        display.replace('\'', "\\'")
    );
    let url = format!(
        "{}/v3/company/{}/query?query={}",
        api_base(environment),
        realm_id,
        urlencoding::encode(&query)
    );

    let http = reqwest::Client::new();
    let resp = http
        .get(&url)
        .bearer_auth(token)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if resp.status().is_success() {
        let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
        if let Some(customers) = json["QueryResponse"]["Customer"].as_array() {
            if let Some(first) = customers.first() {
                if let Some(id) = first["Id"].as_str() {
                    return Ok(id.to_string());
                }
            }
        }
    }

    let body = serde_json::json!({
        "DisplayName": display,
        "PrimaryEmailAddr": if client.email.is_empty() { serde_json::Value::Null } else { serde_json::json!({ "Address": client.email }) },
        "PrimaryPhone": if client.phone.is_empty() { serde_json::Value::Null } else { serde_json::json!({ "FreeFormNumber": client.phone }) },
    });

    let create_url = format!("{}/v3/company/{}/customer", api_base(environment), realm_id);
    let resp = http
        .post(&create_url)
        .bearer_auth(token)
        .header("Accept", "application/json")
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err(format!("Create customer failed: {err}"));
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    json["Customer"]["Id"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Customer created but no Id returned".to_string())
}

pub async fn find_service_item_id(
    environment: &str,
    realm_id: &str,
    token: &str,
) -> Result<String, String> {
    let query = "select Id, Name from Item where Name = 'Services' maxresults 1";
    let url = format!(
        "{}/v3/company/{}/query?query={}",
        api_base(environment),
        realm_id,
        urlencoding::encode(query)
    );
    let http = reqwest::Client::new();
    let resp = http
        .get(&url)
        .bearer_auth(token)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if resp.status().is_success() {
        let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
        if let Some(items) = json["QueryResponse"]["Item"].as_array() {
            if let Some(first) = items.first() {
                if let Some(id) = first["Id"].as_str() {
                    return Ok(id.to_string());
                }
            }
        }
    }

    let fallback_query = "select Id, Name from Item maxresults 1";
    let url = format!(
        "{}/v3/company/{}/query?query={}",
        api_base(environment),
        realm_id,
        urlencoding::encode(fallback_query)
    );
    let resp = http
        .get(&url)
        .bearer_auth(token)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err("Could not find a QBO Item to use for invoice lines".to_string());
    }
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    json["QueryResponse"]["Item"]
        .as_array()
        .and_then(|a| a.first())
        .and_then(|i| i["Id"].as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| "No Items found in QuickBooks company".to_string())
}

pub async fn create_invoice(
    environment: &str,
    realm_id: &str,
    token: &str,
    data: &InvoiceData,
    customer_id: &str,
    item_id: &str,
) -> Result<String, String> {
    let payload = crate::qb::mapper::invoice_to_qbo_json(data, customer_id, item_id);
    let url = format!("{}/v3/company/{}/invoice", api_base(environment), realm_id);
    let http = reqwest::Client::new();
    let resp = http
        .post(&url)
        .bearer_auth(token)
        .header("Accept", "application/json")
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err(format!("Create invoice failed: {err}"));
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    json["Invoice"]["Id"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Invoice created but no Id returned".to_string())
}

pub async fn sync_invoice(
    db: &crate::db::Database,
    environment: &str,
    invoice_id: i64,
) -> Result<String, String> {
    let realm_id = crate::keychain::read_secret(crate::qb::QB_SERVICE, "realm_id")?
        .value
        .filter(|s| !s.is_empty())
        .ok_or_else(|| "QuickBooks not connected (missing realm)".to_string())?;

    let token = oauth::get_valid_access_token().await?;

    db.set_invoice_qb_pending(invoice_id).map_err(|e| e.to_string())?;

    let data = db.get_invoice_data(invoice_id).map_err(|e| e.to_string())?;

    if data.invoice.status == "draft" || data.invoice.status == "voided" {
        return Err("Cannot sync draft or voided invoices to QuickBooks".to_string());
    }
    if let Some(ref qb_id) = data.invoice.qb_invoice_id {
        if !qb_id.is_empty() {
            return Err(format!(
                "Invoice already synced to QuickBooks (id {qb_id})"
            ));
        }
    }

    let client = if let Some(cid) = data.invoice.client_id {
        db.get_client(cid).map_err(|e| e.to_string())?
    } else {
        return Err("Invoice has no client — assign a client before syncing to QuickBooks".to_string());
    };

    let customer_id = find_or_create_customer(environment, &realm_id, &token, &client).await?;
    db.set_client_qb_customer_id(client.id, &customer_id).map_err(|e| e.to_string())?;

    let item_id = find_service_item_id(environment, &realm_id, &token).await?;
    let qb_id = create_invoice(environment, &realm_id, &token, &data, &customer_id, &item_id).await?;
    let now = chrono::Utc::now().to_rfc3339();
    db.set_invoice_qb_synced(invoice_id, &qb_id, &now).map_err(|e| e.to_string())?;
    Ok(qb_id)
}
