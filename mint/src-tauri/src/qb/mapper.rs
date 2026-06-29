//! QuickBooks Online JSON mapping.

use crate::models::InvoiceData;
use serde_json::{json, Value};

pub fn invoice_to_qbo_json(data: &InvoiceData, customer_id: &str, item_id: &str) -> Value {
    let inv = &data.invoice;
    let lines: Vec<Value> = data
        .line_items
        .iter()
        .map(|item| {
            let amount = item.quantity * item.unit_price;
            json!({
                "Amount": amount,
                "DetailType": "SalesItemLineDetail",
                "Description": item.description,
                "SalesItemLineDetail": {
                    "Qty": item.quantity,
                    "UnitPrice": item.unit_price,
                    "ItemRef": { "name": "Services", "value": item_id }
                }
            })
        })
        .collect();

    let mut doc = json!({
        "DocNumber": inv.invoice_number,
        "TxnDate": inv.issue_date,
        "DueDate": inv.due_date,
        "CustomerRef": { "value": customer_id },
        "Line": lines,
        "CustomerMemo": { "value": inv.customer_notes },
        "PrivateNote": inv.internal_notes,
    });

    if inv.tax_amount > 0.0 {
        doc["TxnTaxDetail"] = json!({
            "TotalTax": inv.tax_amount
        });
    }

    doc
}
