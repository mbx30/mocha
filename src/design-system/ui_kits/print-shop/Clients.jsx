/* Clients screen — list + form */
(function () {
  const { Card, Badge, Button, Input, Select } = window.FrappeDesignSystem_75694f;
  const { Ic, PageHeader } = window.FK;
  const D = window.FrappeData;

  // ── ClientForm ───────────────────────────────────────────────────────────
  function ClientForm({ client, onBack }) {
    const isNew = !client;
    const [form, setForm] = React.useState({
      name: client?.name || '',
      company: client?.company || '',
      email: client?.email || '',
      phone: client?.phone || '',
      address: client?.address || '',
      tags: client?.tags || '',
      status: client?.status || 'active',
      notes: '',
    });
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const labelStyle = { font: 'var(--font-caption)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' };
    const inputStyle = { width: '100%', height: '34px', padding: '0 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--surface-inset)', color: 'var(--text-primary)', font: 'var(--font-body)', boxSizing: 'border-box', outline: 'none' };
    const taStyle = { ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical', minHeight: '80px' };

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <Button variant="ghost" size="sm" iconLeft={<Ic n="ArrowLeft" size={14} />} onClick={onBack}>Clients</Button>
          <span style={{ color: 'var(--text-tertiary)' }}>/</span>
          <span style={{ font: 'var(--font-title)', color: 'var(--text-primary)' }}>{isNew ? 'New client' : client.name}</span>
          <div style={{ flex: 1 }} />
          <Button variant="secondary" onClick={onBack}>Cancel</Button>
          <Button variant="primary" iconLeft={<Ic n="Check" size={14} />} onClick={onBack}>
            {isNew ? 'Create client' : 'Save changes'}
          </Button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Card>
              <div style={{ font: 'var(--font-title)', color: 'var(--text-primary)', marginBottom: '14px' }}>Contact info</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Name *</label>
                  <input value={form.name} onChange={set('name')} placeholder="Full name" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Company</label>
                  <input value={form.company} onChange={set('company')} placeholder="Business name" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type="email" value={form.email} onChange={set('email')} placeholder="email@example.com" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input type="tel" value={form.phone} onChange={set('phone')} placeholder="(555) 000-0000" style={inputStyle} />
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <label style={labelStyle}>Address</label>
                <textarea value={form.address} onChange={set('address')} placeholder="Street, city, state, zip" style={taStyle} rows={2} />
              </div>
            </Card>

            <Card>
              <div style={{ font: 'var(--font-title)', color: 'var(--text-primary)', marginBottom: '14px' }}>Notes</div>
              <textarea value={form.notes} onChange={set('notes')} placeholder="Internal notes about this client — not visible to them" style={taStyle} rows={4} />
            </Card>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Card>
              <div style={{ font: 'var(--font-title)', color: 'var(--text-primary)', marginBottom: '14px' }}>Settings</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Status</label>
                  <Select value={form.status} onChange={set('status')} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
                </div>
                <div>
                  <label style={labelStyle}>Tags</label>
                  <input value={form.tags} onChange={set('tags')} placeholder="regular, wholesale, rush… (comma-separated)" style={inputStyle} />
                  <div style={{ marginTop: '5px', font: 'var(--font-caption)', color: 'var(--text-tertiary)' }}>Comma-separated tags for filtering</div>
                </div>
              </div>
            </Card>

            {!isNew && (
              <Card>
                <div style={{ font: 'var(--font-title)', color: 'var(--text-primary)', marginBottom: '12px' }}>History</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { label: 'Orders', value: D.orders.filter(o => o.customer === client.company).length },
                    { label: 'Last order', value: 'Jun 18' },
                    { label: 'Open invoices', value: D.invoices.filter(i => i.customer === client.company && i.status !== 'paid').length },
                    { label: 'Last contacted', value: client.lastContacted },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', font: 'var(--font-body)', color: 'var(--text-secondary)' }}>
                      <span>{label}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 500 }} className="tabular">{value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── ClientList ───────────────────────────────────────────────────────────
  function Clients() {
    const [q, setQ] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('');
    const [editing, setEditing] = React.useState(undefined); // undefined = list, null = new, obj = existing

    if (editing !== undefined) {
      return <ClientForm client={editing} onBack={() => setEditing(undefined)} />;
    }

    const list = D.clients.filter((c) => {
      const matchQ = !q || (c.name + c.company + c.email).toLowerCase().includes(q.toLowerCase());
      const matchStatus = !statusFilter || c.status === statusFilter;
      return matchQ && matchStatus;
    });

    const th = (label, align) => (
      <th style={{ textAlign: align || 'left', font: 'var(--font-caption)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)', color: 'var(--text-tertiary)', padding: '9px 16px', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>{label}</th>
    );
    const td = (children, extra) => (
      <td style={{ padding: '11px 16px', borderBottom: '1px solid var(--border-subtle)', font: 'var(--font-body)', color: 'var(--text-secondary)', ...extra }}>{children}</td>
    );

    const TagChip = ({ label }) => (
      <span style={{ display: 'inline-block', padding: '1px 7px', borderRadius: '999px', background: 'var(--surface-inset)', border: '1px solid var(--border-default)', font: 'var(--font-caption)', color: 'var(--text-secondary)', marginRight: '3px' }}>{label}</span>
    );

    return (
      <div>
        <PageHeader
          title="Clients"
          subtitle={`${D.clients.length} total · ${D.clients.filter(c => c.status === 'active').length} active`}
          actions={<Button variant="primary" iconLeft={<Ic n="UserPlus" size={15} />} onClick={() => setEditing(null)}>New client</Button>}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, maxWidth: '300px' }}>
            <Input placeholder="Search name, company, email…" value={q} onChange={(e) => setQ(e.target.value)} iconLeft={<Ic n="Search" size={14} />} size="sm" />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[{ value: '', label: 'All clients' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
          />
        </div>

        <Card padding="none">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{th('Name')}{th('Company')}{th('Email')}{th('Phone')}{th('Tags')}{th('Status')}{th('Last contacted')}{th('')}</tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} onClick={() => setEditing(c)} style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  {td(<span style={{ font: 'var(--font-body-strong)', color: 'var(--text-primary)' }}>{c.name}</span>)}
                  {td(c.company || <span style={{ color: 'var(--text-disabled)' }}>—</span>)}
                  {td(c.email
                    ? <a href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()} style={{ color: 'var(--brand-text)', textDecoration: 'none' }}>{c.email}</a>
                    : <span style={{ color: 'var(--text-disabled)' }}>—</span>)}
                  {td(c.phone || <span style={{ color: 'var(--text-disabled)' }}>—</span>)}
                  {td(<div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                    {c.tags ? c.tags.split(',').map(t => t.trim()).filter(Boolean).map((tag, i) => <TagChip key={i} label={tag} />) : null}
                  </div>)}
                  {td(<Badge tone={c.status === 'active' ? 'success' : 'neutral'} dot size="sm">{c.status}</Badge>)}
                  {td(<span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }} className="tabular">{c.lastContacted}</span>)}
                  {td(<span style={{ color: 'var(--text-tertiary)' }}><Ic n="ChevronRight" size={15} /></span>, { width: '32px' })}
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-tertiary)', font: 'var(--font-body)' }}>
              {q || statusFilter ? 'No clients match that search.' : 'No clients yet. Add your first client.'}
            </div>
          )}
        </Card>
        <div style={{ marginTop: '10px', font: 'var(--font-caption)', color: 'var(--text-tertiary)' }}>{list.length} client{list.length !== 1 ? 's' : ''}</div>
      </div>
    );
  }

  window.Clients = Clients;
})();
