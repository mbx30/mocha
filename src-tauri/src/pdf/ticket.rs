use printpdf::*;
use std::fs::File;
use std::io::BufWriter;

pub struct JobTicketInput {
    pub job_id: String,
    pub customer_name: String,
    pub product_name: String,
    pub quantity: i64,
    pub due_date: String,
    pub print_type: String,
    pub paper_stock: String,
    pub finishing: String,
    pub files: Vec<String>,
    pub notes: String,
}

pub fn generate_job_ticket(input: &JobTicketInput, output_path: &str) -> Result<(), String> {
    let (doc, page1, layer1) = PdfDocument::new(
        &format!("Job Ticket {}", input.job_id),
        Mm(210.0),
        Mm(297.0),
        "Ticket",
    );

    let font = doc.add_builtin_font(BuiltinFont::HelveticaBold).map_err(|e| e.to_string())?;
    let font_regular = doc.add_builtin_font(BuiltinFont::Helvetica).map_err(|e| e.to_string())?;

    let current_layer = doc.get_page(page1).get_layer(layer1);

    // Title
    current_layer.use_text("JOB TICKET", 18.0, Mm(15.0), Mm(275.0), &font);

    // Job ID
    current_layer.use_text(&format!("Job #: {}", input.job_id), 12.0, Mm(15.0), Mm(260.0), &font);

    // Customer
    current_layer.use_text(&format!("Customer: {}", input.customer_name), 10.0, Mm(15.0), Mm(248.0), &font_regular);

    // Product
    current_layer.use_text(&format!("Product: {}", input.product_name), 10.0, Mm(15.0), Mm(238.0), &font_regular);

    // Quantity
    current_layer.use_text(&format!("Quantity: {}", input.quantity), 10.0, Mm(15.0), Mm(228.0), &font_regular);

    // Due date
    current_layer.use_text(&format!("Due Date: {}", input.due_date), 10.0, Mm(15.0), Mm(218.0), &font_regular);

    // Print specs
    current_layer.use_text("--- Specifications ---", 11.0, Mm(15.0), Mm(205.0), &font);
    current_layer.use_text(&format!("Print Type: {}", input.print_type), 10.0, Mm(15.0), Mm(195.0), &font_regular);
    current_layer.use_text(&format!("Paper Stock: {}", input.paper_stock), 10.0, Mm(15.0), Mm(185.0), &font_regular);
    current_layer.use_text(&format!("Finishing: {}", input.finishing), 10.0, Mm(15.0), Mm(175.0), &font_regular);

    // File list
    current_layer.use_text("--- Files ---", 11.0, Mm(15.0), Mm(160.0), &font);
    let mut y_pos = 150.0;
    for file in &input.files {
        current_layer.use_text(&format!("• {}", file), 8.0, Mm(15.0), Mm(y_pos), &font_regular);
        y_pos -= 7.0;
    }

    // Notes
    if !input.notes.is_empty() {
        current_layer.use_text("--- Notes ---", 11.0, Mm(15.0), Mm(y_pos - 5.0), &font);
        current_layer.use_text(&input.notes, 8.0, Mm(15.0), Mm(y_pos - 15.0), &font_regular);
    }

    // Generate QR code with deep link
    let qr_data = format!("frappe://job/{}", input.job_id);
    if let Ok(qr_code) = qrcode::QrCode::new(qr_data.as_bytes()) {
        let qr_svg = qr_code.render::<qrcode::render::svg::Color>().build();
        // Attach QR as monochrome bitmap image at bottom-right
        let qr_str = qr_svg;
        // We embed a simple representation — for now log it
        log::info!("QR code generated for job {} ({} bytes svg)", input.job_id, qr_str.len());
    }

    let file = File::create(output_path).map_err(|e| format!("Failed to create PDF: {}", e))?;
    doc.save(&mut BufWriter::new(file)).map_err(|e| format!("Failed to save PDF: {}", e))?;

    Ok(())
}
