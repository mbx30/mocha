//! Finance commands: estimate conversion, CSV export, invoice email.

use tauri::State;

use crate::db::Database;
use crate::finance_totals;
use crate::security;

#[tauri::command]
pub fn convert_estimate_to_invoice(
    db: State<'_, Database>,
    estimate_id: i64,
) -> Result<crate::models::InvoiceData, String> {
    db.convert_estimate_to_invoice(estimate_id)
        .map_err(|e| {
            if matches!(e, rusqlite::Error::InvalidQuery) {
                "Estimate must be approved, have line items, and not already be converted".to_string()
            } else {
                e.to_string()
            }
        })
}

#[tauri::command]
pub fn export_invoices_csv(
    db: State<'_, Database>,
    output_path: String,
    invoice_ids: Option<Vec<i64>>,
) -> Result<String, String> {
    let path = security::validate_write_path(&output_path).map_err(|e| e.to_string())?;
    db.export_invoices_csv(path.as_path(), invoice_ids.as_deref())?;
    Ok(output_path)
}

#[tauri::command]
pub fn generate_invoice_pdf(
    db: State<'_, Database>,
    invoice_id: i64,
    output_path: String,
) -> Result<String, String> {
    let path = security::validate_write_path(&output_path).map_err(|e| e.to_string())?;
    let path_str = path.to_string_lossy().into_owned();
    let data = db.get_invoice_data(invoice_id).map_err(|e| e.to_string())?;
    let business = db
        .get_business_info()
        .map_err(|e| e.to_string())?
        .and_then(|b| b.business_name)
        .filter(|n| !n.is_empty())
        .unwrap_or_else(|| "Mint Print Shop".to_string());
    crate::invoice_pdf::generate_invoice_pdf(&path_str, &data, &business)?;
    Ok(path_str)
}

#[tauri::command]
pub fn send_invoice_email(
    db: State<'_, Database>,
    invoice_id: i64,
) -> Result<(), String> {
    let settings = db
        .get_email_settings()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Email settings not configured. Save SMTP settings in Integrations first.".to_string())?;

    let data = db.get_invoice_data(invoice_id).map_err(|e| e.to_string())?;
    let inv = &data.invoice;

    let client = if let Some(cid) = inv.client_id {
        Some(db.get_client(cid).map_err(|e| e.to_string())?)
    } else {
        None
    };

    let to = client
        .as_ref()
        .and_then(|c| if c.email.is_empty() { None } else { Some(c.email.clone()) })
        .ok_or_else(|| "Invoice client has no email address".to_string())?;

    let business = db
        .get_business_info()
        .map_err(|e| e.to_string())?
        .and_then(|b| b.business_name)
        .filter(|n| !n.is_empty())
        .unwrap_or_else(|| "Mint".to_string());

    let subject = format!("Invoice {} from {}", inv.invoice_number, business);
    let mut body = format!(
        "Please find your invoice attached.\n\nInvoice: {}\nIssue date: {}\nDue date: {}\nTotal: {:.2} {}\n\n",
        inv.invoice_number, inv.issue_date, inv.due_date, inv.total, inv.currency
    );
    if !inv.customer_notes.is_empty() {
        body.push_str(&format!("Notes:\n{}\n\n", inv.customer_notes));
    }

    let temp_dir = std::env::temp_dir().join(format!("mint_inv_{invoice_id}"));
    std::fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;
    let pdf_path = temp_dir.join(format!("{}.pdf", inv.invoice_number.replace('/', "-")));
    crate::invoice_pdf::generate_invoice_pdf(
        pdf_path.to_string_lossy().as_ref(),
        &data,
        &business,
    )?;

    let result = crate::email::send_email_via_smtp(
        &settings,
        &to,
        &subject,
        &body,
        Some(pdf_path.to_string_lossy().as_ref()),
    );
    let _ = std::fs::remove_file(&pdf_path);
    result
}

/// Re-export for commands that need total validation in update paths.
#[allow(dead_code)]
pub fn validate_estimate_totals(
    items: &[(f64, f64)],
    tax_rate: f64,
    subtotal: f64,
    tax_amount: f64,
    total: f64,
) -> Result<finance_totals::ComputedTotals, String> {
    finance_totals::validate_totals(items, tax_rate, subtotal, tax_amount, total)
}

#[allow(dead_code)]
pub fn validate_invoice_totals(
    items: &[(f64, f64)],
    tax_rate: f64,
    subtotal: f64,
    tax_amount: f64,
    total: f64,
) -> Result<finance_totals::ComputedTotals, String> {
    finance_totals::validate_totals(items, tax_rate, subtotal, tax_amount, total)
}
