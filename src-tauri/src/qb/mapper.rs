//! Map Mint invoice data to QuickBooks Online JSON.

use crate::models::InvoiceData;
use serde_json::{json, Value};

pub fn invoice_to_qbo_json(data: &InvoiceData, customer_id: &str) -> Value {
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
                    "ItemRef": { "name": "Services", "value": "1" }
                }
            })
        })
        .collect();

    json!({
        "DocNumber": inv.invoice_number,
        "TxnDate": inv.issue_date,
        "DueDate": inv.due_date,
        "CustomerRef": { "value": customer_id },
        "Line": lines,
        "CustomerMemo": { "value": inv.customer_notes },
        "PrivateNote": inv.internal_notes,
    })
}
