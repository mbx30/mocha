/* Estimates screen — list + inline editor */
(function () {
  const { Card, Badge, Button, Input, Select, Tabs } = window.FrappeDesignSystem_75694f;
  const { Ic, Kpi, PageHeader } = window.FK;
  const D = window.FrappeData;

  // ── EstimateEditor ───────────────────────────────────────────────────────
  function EstimateEditor({ estimate, onBack }) {
    const isNew = !estimate;
    const [items, setItems] = React.useState(
      isNew ? [] : D.estimateLineItems
    );
    const [taxRate, setTaxRate] = React.useState(8.5);
    const [status, setStatus] = React.useState(isNew ? 'draft' : estimate.status);

    const CATEGORIES = ['labor', 'materials', 'finishing', 'inventory'];

    const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
    const tax = subtotal * taxRate / 100;
    const total = subtotal + tax;

    const addItem = (cat) => setItems((prev) => [...prev, { id: Date.now(), category: cat, description: '', qty: 1, unitPrice: 0 }]);
    const removeItem = (id) => setItems((prev) => prev.filter((i) => i.id !== id));
    const updateItem = (id, key, val) => setItems((prev) => prev.map((i) => i.id === id ? { ...i, [key]: val } : i));

    const inputStyle = { width: '100%', height: '32px', padding: '0 9px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--surface-inset)', color: 'var(--text-primary)', font: 'var(--font-body)', boxSizing: 'border-box', outline: 'none' };
    const taStyle = { ...inputStyle, height: 'auto', padding: '8px 9px', resize: 'vertical', minHeight: '60px' };

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <Button variant="ghost" size="sm" iconLeft={<Ic n="ArrowLeft" size={14} />} onClick={onBack}>Estimates</Button>
          <span style={{ color: 'var(--text-tertiary)' }}>/</span>
          <span style={{ font: 'var(--font-title)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {isNew ? 'New estimate' : estimate.id}
          </span>
          {!isNew && <Badge tone={D.estimateBadge[estimate.status]?.tone} size="sm">{D.estimateBadge[estimate.status]?.label}</Badge>}
          <div style={{ flex: 1 }} />
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'sent', label: 'Sent' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'converted', label: 'Converted to order' },
            ]}
          />
          <Button variant="primary" iconLeft={<Ic n="Check" size={14} />} onClick={onBack}>
            {isNew ? 'Create estimate' : 'Save'}
          </Button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '16px', alignItems: 'start' }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Card>
              <div style={{ font: 'var(--font-title)', color: 'var(--text-primary)', marginBottom: '14px' }}>Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ font: 'var(--font-caption)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Client</label>
                  <Select value="Acme Co." options={D.clients.map((c) => ({ value: c.company, label: c.company }))} />
                </div>
                <div>
                  <label style={{ font: 'var(--font-caption)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Valid until</label>
                  <input type="date" defaultValue="2026-07-20" style={inputStyle} />
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <label style={{ font: 'var(--font-caption)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Artwork requirements</label>
                <textarea defaultValue="Customer to supply print-ready PDF at 300 dpi with 0.125″ bleed." style={taStyle} />
              </div>
              <div style={{ marginTop: '12px' }}>
                <label style={{ font: 'var(--font-caption)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Internal notes</label>
                <textarea placeholder="For your reference only — not shown to customer" style={taStyle} />
              </div>
            </Card>

            <Card padding="none">
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', font: 'var(--font-title)', color: 'var(--text-primary)' }}>Line items</div>
              {CATEGORIES.map((cat) => {
                const catItems = items.filter((i) => i.category === cat);
                return (
                  <div key={cat} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 16px', background: 'var(--surface-inset)' }}>
                      <span style={{ font: 'var(--font-caption)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)', color: 'var(--text-tertiary)' }}>
                        {cat} {catItems.length > 0 && `(${catItems.length})`}
                      </span>
                      <Button variant="ghost" size="sm" iconLeft={<Ic n="Plus" size={13} />} onClick={() => addItem(cat)}>Add</Button>
                    </div>
                    {catItems.map((item) => (
                      <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 80px auto', gap: '8px', padding: '9px 16px', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
                        <input value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          placeholder="Description" style={inputStyle} />
                        <input type="number" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                          placeholder="Qty" style={{ ...inputStyle, textAlign: 'right', fontFamily: 'var(--font-mono)' }} />
                        <input type="number" value={item.unitPrice} onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          placeholder="Unit $" style={{ ...inputStyle, textAlign: 'right', fontFamily: 'var(--font-mono)' }} />
                        <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--text-primary)', fontSize: 'var(--text-md)' }}>
                          {D.money(item.qty * item.unitPrice)}
                        </div>
                        <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px', display: 'flex' }}>
                          <Ic n="X" size={14} />
                        </button>
                      </div>
                    ))}
                    {catItems.length === 0 && (
                      <div style={{ padding: '10px 16px', color: 'var(--text-disabled)', font: 'var(--font-body)' }}>No {cat} items</div>
                    )}
                  </div>
                );
              })}
            </Card>
          </div>

          {/* Right column — summary */}
          <Card>
            <div style={{ font: 'var(--font-title)', color: 'var(--text-primary)', marginBottom: '14px' }}>Summary</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Labor', amt: items.filter(i => i.category === 'labor').reduce((s, i) => s + i.qty * i.unitPrice, 0) },
                { label: 'Materials', amt: items.filter(i => i.category === 'materials').reduce((s, i) => s + i.qty * i.unitPrice, 0) },
                { label: 'Finishing', amt: items.filter(i => i.category === 'finishing').reduce((s, i) => s + i.qty * i.unitPrice, 0) },
                { label: 'Inventory', amt: items.filter(i => i.category === 'inventory').reduce((s, i) => s + i.qty * i.unitPrice, 0) },
              ].map(({ label, amt }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', font: 'var(--font-body)', color: 'var(--text-secondary)' }}>
                  <span>{label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }} className="tabular">{D.money(amt)}</span>
                </div>
              ))}
              <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', font: 'var(--font-body-strong)', color: 'var(--text-primary)' }}>
                <span>Subtotal</span>
                <span style={{ fontFamily: 'var(--font-mono)' }} className="tabular">{D.money(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <label style={{ font: 'var(--font-body)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Tax (%)</label>
                <input type="number" value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)} style={{ ...inputStyle, width: '80px', textAlign: 'right', fontFamily: 'var(--font-mono)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', font: 'var(--font-body)', color: 'var(--text-secondary)' }}>
                <span>Tax ({taxRate}%)</span>
                <span style={{ fontFamily: 'var(--font-mono)' }} className="tabular">{D.money(tax)}</span>
              </div>
              <div style={{ height: '1px', background: 'var(--border-default)', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ font: 'var(--font-title)', color: 'var(--text-primary)' }}>Total</span>
                <span style={{ font: 'var(--font-h2)', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', letterSpacing: '-0.02em' }} className="tabular">{D.money(total)}</span>
              </div>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Button variant="primary" fullWidth onClick={onBack}>Save estimate</Button>
              <Button variant="secondary" fullWidth iconLeft={<Ic n="Send" size={14} />}>Send to client</Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ── EstimateList ─────────────────────────────────────────────────────────
  function Estimates() {
    const [filter, setFilter] = React.useState('All');
    const [editing, setEditing] = React.useState(undefined); // undefined = list, null = new, obj = existing

    if (editing !== undefined) {
      return <EstimateEditor estimate={editing} onBack={() => setEditing(undefined)} />;
    }

    const list = D.estimates.filter((e) =>
      filter === 'All' ? true :
      filter === 'Open' ? (e.status === 'draft' || e.status === 'sent') :
      filter === 'Approved' ? e.status === 'approved' :
      filter === 'Draft' ? e.status === 'draft' :
      filter === 'Converted' ? e.status === 'converted' : true
    );

    const th = (label, align) => (
      <th style={{ textAlign: align || 'left', font: 'var(--font-caption)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)', color: 'var(--text-tertiary)', padding: '9px 16px', borderBottom: '1px solid var(--border-subtle)' }}>{label}</th>
    );
    const td = (children, extra) => (
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', font: 'var(--font-body)', color: 'var(--text-secondary)', ...extra }}>{children}</td>
    );

    return (
      <div>
        <PageHeader
          title="Estimates"
          subtitle={`${D.estimates.length} total · ${D.estimates.filter(e => e.status === 'sent').length} awaiting response`}
          actions={<Button variant="primary" iconLeft={<Ic n="Plus" size={15} />} onClick={() => setEditing(null)}>New estimate</Button>}
        />

        <div style={{ display: 'flex', gap: '14px', marginBottom: '22px' }}>
          <Kpi label="Sent" value={D.estimates.filter(e => e.status === 'sent').length.toString()} delta="awaiting response" deltaTone="neutral" icon="Send" />
          <Kpi label="Approved" value={D.estimates.filter(e => e.status === 'approved').length.toString()} delta="ready to convert" icon="CheckCircle2" />
          <Kpi label="Draft" value={D.estimates.filter(e => e.status === 'draft').length.toString()} delta="in progress" deltaTone="neutral" icon="FileText" />
          <Kpi label="Pipeline" value={D.money(D.estimates.filter(e => ['sent','approved'].includes(e.status)).reduce((s, e) => s + e.total, 0))} delta="open value" icon="TrendingUp" />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <Tabs variant="pill" value={filter} onChange={setFilter} tabs={['All', 'Open', 'Approved', 'Draft', 'Converted']} />
        </div>

        <Card padding="none">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{th('Estimate')}{th('Client')}{th('Created')}{th('Valid until')}{th('Items', 'right')}{th('Total', 'right')}{th('Status')}{th('')}</tr>
            </thead>
            <tbody>
              {list.map((est) => {
                const b = D.estimateBadge[est.status];
                return (
                  <tr key={est.id} onClick={() => setEditing(est)} style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    {td(<span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--text-primary)' }} className="tabular">{est.id}</span>)}
                    {td(<span style={{ font: 'var(--font-body-strong)', color: 'var(--text-primary)' }}>{est.customer}</span>)}
                    {td(est.created)}
                    {td(<span style={{ color: est.status === 'rejected' ? 'var(--danger-text)' : 'var(--text-secondary)' }}>{est.validUntil}</span>)}
                    {td(<span style={{ fontFamily: 'var(--font-mono)' }} className="tabular">{est.items}</span>, { textAlign: 'right' })}
                    {td(<span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--text-primary)' }} className="tabular">{D.money(est.total)}</span>, { textAlign: 'right' })}
                    {td(<Badge tone={b.tone} dot size="sm">{b.label}</Badge>)}
                    {td(
                      est.status === 'approved'
                        ? <Button variant="subtle" size="sm" iconLeft={<Ic n="ArrowRight" size={13} />}>Convert to order</Button>
                        : est.status === 'draft'
                          ? <Button variant="subtle" size="sm">Send</Button>
                          : <span style={{ color: 'var(--text-disabled)', font: 'var(--font-caption)' }}>—</span>,
                      { textAlign: 'right' }
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {list.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-tertiary)', font: 'var(--font-body)' }}>No estimates match that filter.</div>
          )}
        </Card>
      </div>
    );
  }

  window.Estimates = Estimates;
})();
