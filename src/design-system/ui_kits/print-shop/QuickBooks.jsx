/* QuickBooks sync panel */
(function () {
  const { Card, Badge, Button } = window.MintDesignSystem_75694f;
  const { Ic, PageHeader } = window.FK;
  const D = window.MintData;

  function QuickBooks() {
    const [statuses, setStatuses] = React.useState(
      Object.fromEntries(D.invoices.map((inv) => [inv.id, inv.qbStatus]))
    );
    const [syncing, setSyncing] = React.useState(new Set());
    const [successIds, setSuccessIds] = React.useState(new Set());

    const handleSync = async (invId) => {
      setSyncing((prev) => new Set([...prev, invId]));
      setSuccessIds((prev) => { const s = new Set(prev); s.delete(invId); return s; });
      // simulate network delay
      await new Promise((r) => setTimeout(r, 900));
      setStatuses((prev) => ({ ...prev, [invId]: 'synced' }));
      setSuccessIds((prev) => new Set([...prev, invId]));
      setSyncing((prev) => { const s = new Set(prev); s.delete(invId); return s; });
    };

    const handleSyncAll = () => {
      D.invoices
        .filter((inv) => statuses[inv.id] !== 'synced' && inv.status !== 'draft')
        .forEach((inv) => handleSync(inv.id));
    };

    const unsyncedCount = D.invoices.filter((inv) => statuses[inv.id] !== 'synced' && inv.status !== 'draft').length;

    const th = (label, align) => (
      <th style={{ textAlign: align || 'left', font: 'var(--font-caption)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)', color: 'var(--text-tertiary)', padding: '9px 16px', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>{label}</th>
    );
    const td = (children, extra) => (
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', font: 'var(--font-body)', color: 'var(--text-secondary)', ...extra }}>{children}</td>
    );

    return (
      <div>
        <PageHeader
          title="QuickBooks"
          subtitle="Track sync status for invoices. API keys required for live sync."
          actions={
            unsyncedCount > 0
              ? <Button variant="primary" iconLeft={<Ic n="RefreshCw" size={14} />} onClick={handleSyncAll}>Mark all synced ({unsyncedCount})</Button>
              : null
          }
        />

        {/* Connection card */}
        <Card style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--surface-inset)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', flexShrink: 0 }}>
              <Ic n="Zap" size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ font: 'var(--font-body-strong)', color: 'var(--text-primary)' }}>QuickBooks Online</div>
              <div style={{ font: 'var(--font-caption)', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                Not connected. Configure API keys in Settings to enable automatic invoice sync.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '999px', background: 'var(--surface-inset)', border: '1px solid var(--border-default)', font: 'var(--font-caption)', fontWeight: 500, color: 'var(--text-tertiary)' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-disabled)', display: 'inline-block' }} />
                Not connected
              </span>
              <Button variant="secondary" size="sm" iconLeft={<Ic n="Settings" size={13} />}>Configure</Button>
            </div>
          </div>
        </Card>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Total invoices', value: D.invoices.length, icon: 'Receipt', tone: null },
            { label: 'Synced', value: D.invoices.filter(i => statuses[i.id] === 'synced').length, icon: 'CheckCircle2', tone: 'success' },
            { label: 'Not synced', value: D.invoices.filter(i => statuses[i.id] === 'not_synced').length, icon: 'Clock', tone: null },
            { label: 'Errors', value: D.invoices.filter(i => statuses[i.id] === 'sync_error').length, icon: 'AlertCircle', tone: 'danger' },
          ].map(({ label, value, icon, tone }) => (
            <Card key={label}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ font: 'var(--font-caption)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)', color: 'var(--text-tertiary)' }}>{label}</div>
                <Ic n={icon} size={15} style={{ color: tone === 'danger' ? 'var(--danger)' : tone === 'success' ? 'var(--success)' : 'var(--text-tertiary)' }} />
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }} className="tabular">{value}</div>
            </Card>
          ))}
        </div>

        {/* Invoice table */}
        <Card padding="none">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{th('Invoice')}{th('Customer')}{th('Invoice status')}{th('Amount', 'right')}{th('QB status')}{th('', 'right')}</tr>
            </thead>
            <tbody>
              {D.invoices.map((inv) => {
                const qbB = D.qbStatusBadge[statuses[inv.id]] || D.qbStatusBadge['not_synced'];
                const invB = D.invoiceBadge[inv.status];
                const isSyncing = syncing.has(inv.id);
                const justSynced = successIds.has(inv.id);
                const canSync = inv.status !== 'draft' && statuses[inv.id] !== 'synced';
                return (
                  <tr key={inv.id}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    {td(<span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--text-primary)' }} className="tabular">{inv.id}</span>)}
                    {td(<span style={{ font: 'var(--font-body-strong)', color: 'var(--text-primary)' }}>{inv.customer}</span>)}
                    {td(<Badge tone={invB.tone} dot size="sm">{invB.label}</Badge>)}
                    {td(<span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--text-primary)' }} className="tabular">{D.money(inv.amount)}</span>, { textAlign: 'right' })}
                    {td(
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Badge tone={qbB.tone} size="sm">{qbB.label}</Badge>
                        {justSynced && <span style={{ color: 'var(--success)', display: 'flex' }}><Ic n="Check" size={14} /></span>}
                      </div>
                    )}
                    {td(
                      canSync
                        ? <Button variant="secondary" size="sm" disabled={isSyncing} onClick={() => handleSync(inv.id)}
                            iconLeft={isSyncing ? <Ic n="Loader" size={13} /> : <Ic n="RefreshCw" size={13} />}>
                            {isSyncing ? 'Syncing…' : 'Mark synced'}
                          </Button>
                        : statuses[inv.id] === 'synced'
                          ? <span style={{ color: 'var(--text-disabled)', font: 'var(--font-caption)' }}>In sync</span>
                          : <span style={{ color: 'var(--text-disabled)', font: 'var(--font-caption)' }}>Draft</span>,
                      { textAlign: 'right' }
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  window.QuickBooks = QuickBooks;
})();
