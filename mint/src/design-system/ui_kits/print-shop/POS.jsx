/* Point of Sale screen — search → select → collect payment */
(function () {
  const { Card, Button, Input, Select, Badge } = window.MintDesignSystem_75694f;
  const { Ic, PageHeader } = window.FK;
  const D = window.MintData;

  const PAYMENT_METHODS = [
    { value: 'cash', label: 'Cash' },
    { value: 'check', label: 'Check' },
    { value: 'card', label: 'Card' },
    { value: 'bank_transfer', label: 'Bank transfer' },
    { value: 'other', label: 'Other' },
  ];

  // Mock searchable items: orders + invoices
  const SEARCHABLE = [
    ...D.invoices.map((inv) => ({
      type: 'invoice', id: inv.id, number: inv.id, customer: inv.customer,
      total: inv.amount, balance: inv.status === 'paid' ? 0 : inv.amount - (inv.deposit || 0),
      status: inv.status,
    })),
    ...D.orders.filter((o) => o.status !== 'shipped').map((o) => ({
      type: 'order', id: o.id, number: `ORD-${o.id}`, customer: o.customer,
      total: o.total, balance: o.total, status: o.status,
    })),
  ];

  function POS() {
    const [query, setQuery] = React.useState('');
    const [results, setResults] = React.useState([]);
    const [selected, setSelected] = React.useState(null);
    const [searched, setSearched] = React.useState(false);

    const [amount, setAmount] = React.useState('');
    const [method, setMethod] = React.useState('cash');
    const [ref, setRef] = React.useState('');
    const [notes, setNotes] = React.useState('');
    const [success, setSuccess] = React.useState(null);
    const [error, setError] = React.useState(null);

    const handleSearch = () => {
      if (!query.trim()) return;
      const q = query.toLowerCase();
      const found = SEARCHABLE.filter((r) =>
        r.number.toLowerCase().includes(q) ||
        r.customer.toLowerCase().includes(q)
      );
      setResults(found);
      setSearched(true);
      setSelected(null);
    };

    const handleSelect = (r) => {
      setSelected(r);
      setAmount(r.balance.toFixed(2));
      setError(null);
    };

    const handlePay = () => {
      const amt = parseFloat(amount);
      if (isNaN(amt) || amt <= 0) { setError('Enter a valid amount.'); return; }
      if (amt > selected.balance + 0.01) { setError(`Amount exceeds balance (${D.money(selected.balance)}).`); return; }
      if (method === 'check' && !ref.trim()) { setError('Check number is required.'); return; }
      setError(null);
      const remaining = Math.max(0, selected.balance - amt);
      setSuccess({ amount: amt, customer: selected.customer, number: selected.number, remaining });
      setSelected(null); setResults([]); setQuery(''); setAmount(''); setRef(''); setNotes(''); setMethod('cash');
    };

    const labelStyle = { font: 'var(--font-caption)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' };
    const inputStyle = { width: '100%', height: '36px', padding: '0 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--surface-inset)', color: 'var(--text-primary)', font: 'var(--font-body)', boxSizing: 'border-box', outline: 'none' };

    return (
      <div>
        <PageHeader title="Point of Sale" subtitle="Look up an order or invoice to collect payment." />

        {success && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: 'var(--success-subtle)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-lg)', marginBottom: '20px', color: 'var(--success-text)' }}>
            <Ic n="CheckCircle2" size={20} />
            <div style={{ flex: 1 }}>
              <strong>{D.money(success.amount)}</strong> collected from {success.customer} ({success.number}).
              {success.remaining > 0
                ? ` Remaining balance: ${D.money(success.remaining)}.`
                : ' Paid in full.'}
            </div>
            <Button variant="secondary" size="sm" onClick={() => setSuccess(null)}>Dismiss</Button>
          </div>
        )}

        <div style={{ maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Search */}
          <Card>
            <div style={{ font: 'var(--font-title)', color: 'var(--text-primary)', marginBottom: '14px' }}>Find order or invoice</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <Input
                  placeholder="Order or invoice number, or customer name…"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSearched(false); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                  iconLeft={<Ic n="Search" size={14} />}
                />
              </div>
              <Button variant="primary" onClick={handleSearch} disabled={!query.trim()}>Search</Button>
            </div>

            {searched && results.length === 0 && (
              <div style={{ marginTop: '12px', font: 'var(--font-body)', color: 'var(--text-tertiary)' }}>No results for "{query}".</div>
            )}

            {results.length > 0 && !selected && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {results.map((r) => (
                  <button key={`${r.type}-${r.id}`} onClick={() => handleSelect(r)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', background: 'var(--surface-card)', cursor: 'pointer', textAlign: 'left', transition: 'background var(--duration-fast)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface-card)'}>
                    <Badge tone={r.type === 'invoice' ? 'brand' : 'info'} size="sm">{r.type}</Badge>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--text-primary)', flex: 1 }} className="tabular">{r.number}</span>
                    <span style={{ font: 'var(--font-body)', color: 'var(--text-secondary)', flex: 2 }}>{r.customer}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: r.balance > 0 ? 'var(--text-primary)' : 'var(--success-text)', fontWeight: 500 }} className="tabular">
                      {r.balance > 0 ? `${D.money(r.balance)} due` : 'Paid'}
                    </span>
                    <Ic n="ChevronRight" size={15} style={{ color: 'var(--text-tertiary)' }} />
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Payment form */}
          {selected && (
            <Card>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
                <div>
                  <div style={{ font: 'var(--font-h3)', color: 'var(--text-primary)' }}>
                    {selected.type === 'invoice' ? 'Invoice' : 'Order'} {selected.number}
                  </div>
                  <div style={{ font: 'var(--font-body)', color: 'var(--text-secondary)', marginTop: '2px' }}>{selected.customer}</div>
                  <div style={{ font: 'var(--font-body-strong)', color: 'var(--text-primary)', marginTop: '6px' }}>
                    Balance due: <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xl)' }} className="tabular">{D.money(selected.balance)}</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" iconLeft={<Ic n="ArrowLeft" size={13} />} onClick={() => setSelected(null)}>Change</Button>
              </div>

              {error && (
                <div style={{ padding: '10px 12px', background: 'var(--danger-subtle)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', color: 'var(--danger-text)', font: 'var(--font-body)', marginBottom: '14px' }}>{error}</div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Amount</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', font: 'var(--font-body)', pointerEvents: 'none' }}>$</span>
                    <input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                      style={{ ...inputStyle, paddingLeft: '22px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xl)', height: '44px', fontWeight: 600 }} autoFocus />
                  </div>
                  {selected.balance > 0 && parseFloat(amount) !== selected.balance && (
                    <button onClick={() => setAmount(selected.balance.toFixed(2))}
                      style={{ marginTop: '6px', font: 'var(--font-caption)', color: 'var(--brand-text)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                      Fill balance ({D.money(selected.balance)})
                    </button>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>Payment method</label>
                  <Select value={method} onChange={(e) => { setMethod(e.target.value); setRef(''); }} options={PAYMENT_METHODS} />
                </div>

                {method === 'check' && (
                  <div>
                    <label style={labelStyle}>Check number *</label>
                    <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. 1042" style={inputStyle} />
                  </div>
                )}

                {method === 'card' && (
                  <div>
                    <label style={labelStyle}>Card last 4 (optional)</label>
                    <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="4 digits" maxLength="4" style={inputStyle} />
                  </div>
                )}

                <div>
                  <label style={labelStyle}>Notes (optional)</label>
                  <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes" style={inputStyle} />
                </div>

                <Button variant="primary" onClick={handlePay} style={{ height: '42px', fontSize: 'var(--text-lg)', fontWeight: 600 }}>
                  Collect {amount && !isNaN(parseFloat(amount)) ? D.money(parseFloat(amount)) : '—'}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    );
  }

  window.POS = POS;
})();
