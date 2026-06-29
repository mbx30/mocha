//! Minimal branded invoice PDF (single-page text layout).

use crate::models::InvoiceData;
use std::io::Write;

fn pdf_escape(s: &str) -> String {
    s.replace('\\', "\\\\")
        .replace('(', "\\(")
        .replace(')', "\\)")
}

/// Write a simple one-page invoice PDF to `output_path`.
pub fn generate_invoice_pdf(
    output_path: &str,
    data: &InvoiceData,
    business_name: &str,
) -> Result<(), String> {
    let inv = &data.invoice;
    let mut lines: Vec<String> = vec![
        business_name.to_string(),
        format!("INVOICE {}", inv.invoice_number),
        format!("Issue date: {}", inv.issue_date),
        format!("Due date: {}", inv.due_date),
        String::new(),
        "Line items:".to_string(),
    ];
    for item in &data.line_items {
        lines.push(format!(
            "{}  qty {}  @ {:.2}  = {:.2}",
            item.description,
            item.quantity,
            item.unit_price,
            item.quantity * item.unit_price
        ));
    }
    lines.push(String::new());
    lines.push(format!("Subtotal: {:.2}", inv.subtotal));
    lines.push(format!("Tax: {:.2}", inv.tax_amount));
    lines.push(format!("Total: {:.2} {}", inv.total, inv.currency));
    if !inv.customer_notes.is_empty() {
        lines.push(String::new());
        lines.push(format!("Notes: {}", inv.customer_notes));
    }

    let mut stream = String::from("BT\n/F1 11 Tf\n");
    let mut y = 780.0;
    for line in &lines {
        let escaped = pdf_escape(line);
        stream.push_str(&format!("1 0 0 1 50 {y} Tm\n({escaped}) Tj\n"));
        y -= 14.0;
    }
    stream.push_str("ET\n");
    let stream_len = stream.len();

    let mut pdf = String::new();
    pdf.push_str("%PDF-1.4\n");
    let mut offsets = vec![0usize];

    offsets.push(pdf.len());
    pdf.push_str("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

    offsets.push(pdf.len());
    pdf.push_str("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

    offsets.push(pdf.len());
    pdf.push_str(
        "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] \
         /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
    );

    offsets.push(pdf.len());
    pdf.push_str(&format!(
        "4 0 obj\n<< /Length {stream_len} >>\nstream\n{stream}endstream\nendobj\n"
    ));

    offsets.push(pdf.len());
    pdf.push_str(
        "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    );

    let xref_pos = pdf.len();
    pdf.push_str(&format!("xref\n0 {}\n", offsets.len()));
    pdf.push_str("0000000000 65535 f \n");
    for off in &offsets[1..] {
        pdf.push_str(&format!("{:010} 00000 n \n", off));
    }
    pdf.push_str(&format!(
        "trailer\n<< /Size {} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n",
        offsets.len()
    ));

    let mut file =
        std::fs::File::create(output_path).map_err(|e| format!("create pdf: {e}"))?;
    file.write_all(pdf.as_bytes())
        .map_err(|e| format!("write pdf: {e}"))?;
    Ok(())
}
