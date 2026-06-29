//! Server-side subtotal / tax / total recalculation for estimates and invoices.

const TOTAL_TOLERANCE: f64 = 0.02;

pub struct ComputedTotals {
    pub subtotal: f64,
    pub tax_amount: f64,
    pub total: f64,
}

pub fn round_money(n: f64) -> f64 {
    (n * 100.0).round() / 100.0
}

pub fn compute_subtotal(line_items: &[(f64, f64)]) -> f64 {
    let sum: f64 = line_items.iter().map(|(qty, price)| qty * price).sum();
    round_money(sum)
}

pub fn compute_totals(line_items: &[(f64, f64)], tax_rate: f64) -> ComputedTotals {
    let subtotal = compute_subtotal(line_items);
    let tax_amount = round_money(subtotal * (tax_rate / 100.0));
    let total = round_money(subtotal + tax_amount);
    ComputedTotals {
        subtotal,
        tax_amount,
        total,
    }
}

/// Returns an error message if client-sent totals diverge from server calculation.
pub fn validate_totals(
    line_items: &[(f64, f64)],
    tax_rate: f64,
    client_subtotal: f64,
    client_tax_amount: f64,
    client_total: f64,
) -> Result<ComputedTotals, String> {
    let computed = compute_totals(line_items, tax_rate);
    if (computed.subtotal - client_subtotal).abs() > TOTAL_TOLERANCE
        || (computed.tax_amount - client_tax_amount).abs() > TOTAL_TOLERANCE
        || (computed.total - client_total).abs() > TOTAL_TOLERANCE
    {
        return Err(format!(
            "Totals mismatch: expected subtotal {} tax {} total {}, got {} {} {}",
            computed.subtotal,
            computed.tax_amount,
            computed.total,
            client_subtotal,
            client_tax_amount,
            client_total
        ));
    }
    Ok(computed)
}
