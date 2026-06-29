/* Inventory screen — stock grid with alerts */
(function () {
  const { Card, Badge, Button, Input, Select } = window.MintDesignSystem_75694f;
  const { Ic, Kpi, PageHeader } = window.FK;
  const D = window.MintData;

  function StockBar({ pct, status }) {
    const color = status === 'critical' ? 'var(--danger)' : status === 'low' ? 'var(--warning)' : 'var(--success)';
    return (
      <div style={{ height: '4px', background: 'var(--surface-inset)', borderRadius: '999px', overflow: 'hidden', margin: '6px 0 2px' }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: '999px', transition: 'width 0.3s' }} />
      </div>
    );
  }

  // ── Add/Edit Item Form ───────────────────────────────────────────────────
  function ItemForm({ item, onBack }) {
    const isNew = !item;
    const [form, setForm] = React.useState({
      material: item?.material || '',
      size: item?.size || '',
      attributes: item?.attributes || '',
      qty: item?.qty || 0,
      unit: item?.unit || 'sheets',
      reorderLevel: item?.reorderLevel || 100,
      alertType: 'quantity',
      alertThreshold: 50,
    });
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const inputStyle = { width: '100%', height: '34px', padding: '0 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--surface-inset)', color: 'var(--text-primary)', font: 'var(--font-body)', boxSizing: 'border-box', outline: 'none', fontFamily: 'var(--font-mono)' };
    const labelStyle = { font: 'var(--font-caption)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' };

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <Button variant="ghost" size="sm" iconLeft={<Ic n="ArrowLeft" size={14} />} onClick={onBack}>Inventory</Button>
          <span style={{ color: 'var(--text-tertiary)' }}>/</span>
          <span style={{ font: 'var(--font-title)', color: 'var(--text-primary)' }}>{isNew ? 'New item' : `${item.material} — ${item.size}`}</span>
          <div style={{ flex: 1 }} />
          <Button variant="secondary" onClick={onBack}>Cancel</Button>
          <Button variant="primary" onClick={onBack}>{isNew ? 'Add item' : 'Save'}</Button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Card>
              <div style={{ font: 'var(--font-title)', color: 'var(--text-primary)', marginBottom: '14px' }}>Material</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[['material', 'Material type *', 'e.g. 16pt Matte'], ['size', 'Size', 'e.g. 8.5×11"'], ['attributes', 'Attributes', 'e.g. C2S, Outdoor'], ['unit', 'Unit', 'sheets, sq ft, rolls…']].map(([k, label, ph]) => (
                  <div key={k}>
                    <label style={labelStyle}>{label}</label>
                    <input value={form[k]} onChange={set(k)} placeholder={ph} style={{ ...inputStyle, fontFamily: 'var(--font-sans)' }} />
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <div style={{ font: 'var(--font-title)', color: 'var(--text-primary)', marginBottom: '14px' }}>Stock levels</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Current quantity</label>
                  <input type="number" value={form.qty} onChange={set('qty')} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Reorder level</label>
                  <input type="number" value={form.reorderLevel} onChange={set('reorderLevel')} style={inputStyle} />
                </div>
              </div>
            </Card>
          </div>
          <Card>
            <div style={{ font: 'var(--font-title)', color: 'var(--text-primary)', marginBottom: '14px' }}>Alert settings</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Alert type</label>
                <Select value={form.alertType} onChange={set('alertType')} options={[{ value: 'quantity', label: 'Fixed quantity' }, { value: 'percentage', label: 'Percentage of reorder' }]} />
              </div>
              <div>
                <label style={labelStyle}>Alert threshold {form.alertType === 'percentage' ? '(%)' : `(${form.unit})`}</label>
                <input type="number" value={form.alertThreshold} onChange={set('alertThreshold')} style={inputStyle} />
              </div>
              <div style={{ padding: '10px', background: 'var(--surface-inset)', borderRadius: 'var(--radius-md)', font: 'var(--font-caption)', color: 'var(--text-tertiary)' }}>
                Alert fires when stock {form.alertType === 'percentage' ? `falls below ${form.alertThreshold}% of reorder level` : `falls at or below ${form.alertThreshold} ${form.unit}`}.
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ── InventoryList ────────────────────────────────────────────────────────
  function Inventory() {
    const [q, setQ] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('');
    const [editing, setEditing] = React.useState(undefined);
    const [dismissedAlerts, setDismissedAlerts] = React.useState(new Set());

    if (editing !== undefined) {
      return <ItemForm item={editing} onBack={() => setEditing(undefined)} />;
    }

    const alerts = D.inventory.filter((i) => (i.status === 'critical' || i.status === 'low') && !dismissedAlerts.has(i.id));

    const list = D.inventory.filter((i) => {
      const matchQ = !q || (i.material + i.size + i.attributes).toLowerCase().includes(q.toLowerCase());
      const matchS = !statusFilter || i.status === statusFilter;
      return matchQ && matchS;
    });

    const statusBadgeTone = { normal: 'success', low: 'warning', critical: 'danger' };

    return (
      <div>
        <PageHeader
          title="Inventory"
          subtitle={`${D.inventory.length} materials · ${D.inventory.filter(i => i.status !== 'normal').length} alerts`}
          actions={<Button variant="primary" iconLeft={<Ic n="Plus" size={15} />} onClick={() => setEditing(null)}>Add item</Button>}
        />

        <div style={{ display: 'flex', gap: '14px', marginBottom: '22px' }}>
          <Kpi label="Total items" value={D.inventory.length.toString()} delta="across all stock" deltaTone="neutral" icon="Boxes" />
          <Kpi label="Low stock" value={D.inventory.filter(i => i.status === 'low').length.toString()} delta="need reorder soon" deltaTone="warning" icon="AlertTriangle" />
          <Kpi label="Critical" value={D.inventory.filter(i => i.status === 'critical').length.toString()} delta="reorder now" deltaTone="danger" icon="AlertOctagon" />
          <Kpi label="Healthy" value={D.inventory.filter(i => i.status === 'normal').length.toString()} delta="well-stocked" icon="CheckCircle2" />
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <Card style={{ marginBottom: '16px', borderColor: 'var(--danger)', borderWidth: '1px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', font: 'var(--font-body-strong)', color: 'var(--danger-text)' }}>
                <Ic n="AlertTriangle" size={15} />{alerts.length} stock alert{alerts.length !== 1 ? 's' : ''}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {alerts.map((item) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', background: 'var(--surface-inset)', borderRadius: 'var(--radius-md)' }}>
                  <Badge tone={statusBadgeTone[item.status]} size="sm">{item.status.toUpperCase()}</Badge>
                  <div style={{ flex: 1, font: 'var(--font-body)', color: 'var(--text-primary)' }}>{item.material} — {item.size}</div>
                  <div style={{ font: 'var(--font-body)', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }} className="tabular">
                    {item.qty} {item.unit} remaining
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => setEditing(item)}>Restock</Button>
                  <button onClick={() => setDismissedAlerts((s) => new Set([...s, item.id]))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px', display: 'flex' }}>
                    <Ic n="X" size={14} />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
          <div style={{ flex: 1, maxWidth: '280px' }}>
            <Input placeholder="Search materials…" value={q} onChange={(e) => setQ(e.target.value)} iconLeft={<Ic n="Search" size={14} />} size="sm" />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            options={[{ value: '', label: 'All status' }, { value: 'normal', label: 'In stock' }, { value: 'low', label: 'Low' }, { value: 'critical', label: 'Critical' }]} />
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
          {list.map((item) => (
            <Card key={item.id} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ font: 'var(--font-body-strong)', color: 'var(--text-primary)' }}>{item.material}</div>
                  <div style={{ font: 'var(--font-caption)', color: 'var(--text-tertiary)', marginTop: '2px' }}>{item.size}{item.attributes ? ` · ${item.attributes}` : ''}</div>
                </div>
                <Badge tone={statusBadgeTone[item.status]} size="sm">{item.status}</Badge>
              </div>

              <div style={{ marginBottom: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', font: 'var(--font-caption)', color: 'var(--text-tertiary)', marginBottom: '2px' }}>
                  <span>In stock</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }} className="tabular">{item.qty.toLocaleString()} {item.unit}</span>
                </div>
                <StockBar pct={item.stockPct} status={item.status} />
                <div style={{ font: 'var(--font-caption)', color: 'var(--text-tertiary)' }}>Reorder at {item.reorderLevel} {item.unit}</div>
              </div>

              {item.lastRestocked && (
                <div style={{ font: 'var(--font-caption)', color: 'var(--text-tertiary)', marginBottom: '10px' }}>
                  Last restocked {item.lastRestocked}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="secondary" size="sm" fullWidth onClick={() => setEditing(item)}>Edit</Button>
                {item.status !== 'normal' && (
                  <Button variant="subtle" size="sm" iconLeft={<Ic n="PackagePlus" size={13} />} onClick={() => setEditing(item)}>Restock</Button>
                )}
              </div>
            </Card>
          ))}
        </div>

        {list.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-tertiary)', font: 'var(--font-body)' }}>
            {q || statusFilter ? 'No items match your search.' : 'No inventory yet. Add your first item.'}
          </div>
        )}
      </div>
    );
  }

  window.Inventory = Inventory;
})();
