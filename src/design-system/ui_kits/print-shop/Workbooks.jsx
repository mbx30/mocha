/* Workbooks screen — list + spreadsheet grid */
(function () {
  const { Card, Button, Badge } = window.FrappeDesignSystem_75694f;
  const { Ic, PageHeader } = window.FK;

  // ── Mock workbook data ───────────────────────────────────────────────────
  const WORKBOOKS = [
    { id: 1, name: 'June Orders', sheets: ['Sheet 1', 'Summary'], rows: 14, updated: 'Jun 19' },
    { id: 2, name: 'Q2 Revenue', sheets: ['Revenue', 'By Client', 'Forecast'], rows: 42, updated: 'Jun 18' },
    { id: 3, name: 'Inventory Tracker', sheets: ['Stock Levels', 'Reorders'], rows: 8, updated: 'Jun 15' },
    { id: 4, name: 'Client Contacts', sheets: ['Contacts'], rows: 23, updated: 'Jun 10' },
  ];

  const COLS_ORDERS = ['Order #', 'Customer', 'Job description', 'Qty', 'Stock', 'Total', 'Due date', 'Status'];
  const ROWS_ORDERS = [
    ['1048', 'Acme Co.', '500 matte business cards', '500', '16pt Matte', '$184.00', 'Jun 20', 'On press'],
    ['1047', 'Northwind Cafe', 'A-frame sidewalk banner', '2', '13oz Vinyl', '$240.00', 'Jun 21', 'Awaiting art'],
    ['1046', 'Lumen Studio', 'Tri-fold brochures', '1000', '100lb Gloss', '$612.50', 'Jun 22', 'Queued'],
    ['1045', 'Harbor Yoga', 'Vinyl window decals', '12', 'Cut Vinyl', '$96.00', 'Jun 22', 'Prepress'],
    ['1044', 'Acme Co.', 'Letterhead reprint', '250', '70lb Uncoated', '$78.00', '—', 'Shipped'],
    ['1043', 'Pine & Oak', 'Foil wedding invites', '120', '120lb Cotton', '$540.00', 'Jun 23', 'Bindery'],
    ['1042', 'Bright Labs', 'Roll-up retractable banner', '1', 'Polyester', '$159.00', 'Jun 19', 'Overdue'],
    ['1041', 'Cedar Dental', 'Appointment cards', '2000', '14pt Gloss', '$220.00', 'Jun 28', 'Queued'],
    ['1040', 'Northwind Cafe', 'Window clings seasonal', '6', 'Static Cling', '$88.00', 'Jul 2', 'Queued'],
    ['1039', 'Lumen Studio', 'Poster series 18×24', '50', '100lb Matte', '$310.00', 'Jul 5', 'Draft'],
  ];

  // ── Spreadsheet ──────────────────────────────────────────────────────────
  function Spreadsheet({ cols, rows, onCellChange }) {
    const [editing, setEditing] = React.useState(null); // {row, col}
    const [cellValues, setCellValues] = React.useState(rows.map(r => [...r]));
    const [editVal, setEditVal] = React.useState('');

    const startEdit = (ri, ci) => {
      setEditing({ ri, ci });
      setEditVal(cellValues[ri][ci]);
    };

    const commitEdit = () => {
      if (!editing) return;
      const { ri, ci } = editing;
      setCellValues((prev) => {
        const next = prev.map(r => [...r]);
        next[ri][ci] = editVal;
        return next;
      });
      setEditing(null);
    };

    const isNumeric = (s) => !isNaN(parseFloat(s)) || s.startsWith('$');

    const thStyle = { padding: '7px 12px', borderRight: '1px solid var(--border-subtle)', borderBottom: '2px solid var(--border-default)', font: 'var(--font-caption)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)', color: 'var(--text-tertiary)', background: 'var(--surface-inset)', whiteSpace: 'nowrap', textAlign: 'left', userSelect: 'none' };
    const tdBase = { padding: '6px 12px', borderRight: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', font: 'var(--font-body)', color: 'var(--text-primary)', cursor: 'cell', whiteSpace: 'nowrap' };

    return (
      <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '36px', color: 'var(--text-disabled)', textAlign: 'center' }}>#</th>
              {cols.map((col, ci) => <th key={ci} style={thStyle}>{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {cellValues.map((row, ri) => (
              <tr key={ri}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <td style={{ ...tdBase, color: 'var(--text-disabled)', textAlign: 'center', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', background: 'var(--surface-inset)', cursor: 'default', userSelect: 'none' }}>{ri + 1}</td>
                {row.map((cell, ci) => {
                  const isActive = editing && editing.ri === ri && editing.ci === ci;
                  const mono = isNumeric(cell);
                  return (
                    <td key={ci} style={{ ...tdBase, fontFamily: mono ? 'var(--font-mono)' : 'inherit', textAlign: mono ? 'right' : 'left', outline: isActive ? '2px solid var(--brand)' : 'none', outlineOffset: '-1px', background: isActive ? 'var(--brand-subtle)' : 'transparent', position: 'relative' }}
                      onClick={() => startEdit(ri, ci)}>
                      {isActive
                        ? <input value={editVal} onChange={(e) => setEditVal(e.target.value)} onBlur={commitEdit} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Tab') commitEdit(); if (e.key === 'Escape') setEditing(null); }}
                            autoFocus style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', background: 'transparent', font: 'inherit', color: 'var(--text-primary)', padding: '0 12px', outline: 'none', fontFamily: mono ? 'var(--font-mono)' : 'inherit', textAlign: mono ? 'right' : 'left', boxSizing: 'border-box' }} />
                        : cell}
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* New row ghost */}
            <tr style={{ opacity: 0.4 }}>
              <td style={{ ...tdBase, color: 'var(--text-disabled)', textAlign: 'center', background: 'var(--surface-inset)', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>{cellValues.length + 1}</td>
              {cols.map((_, ci) => <td key={ci} style={{ ...tdBase, color: 'var(--text-disabled)' }}>—</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  // ── WorkbookList ─────────────────────────────────────────────────────────
  function Workbooks() {
    const [activeId, setActiveId] = React.useState(1);
    const [activeSheet, setActiveSheet] = React.useState(0);
    const active = WORKBOOKS.find((wb) => wb.id === activeId);

    return (
      <div style={{ height: 'calc(100vh - 96px)', display: 'flex', flexDirection: 'column', gap: '0' }}>
        {/* Header */}
        <PageHeader
          title="Workbooks"
          subtitle="Import and edit tabular data — CSV, Excel, and cloud sources."
          actions={<Button variant="primary" iconLeft={<Ic n="Plus" size={15} />}>New workbook</Button>}
        />

        {/* Layout */}
        <div style={{ display: 'flex', gap: '0', flex: 1, minHeight: 0, border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--surface-card)' }}>
          {/* Sidebar */}
          <div style={{ width: '196px', flexShrink: 0, borderRight: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', background: 'var(--surface-inset)' }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)', font: 'var(--font-caption)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)', color: 'var(--text-tertiary)' }}>Workbooks</div>
            {WORKBOOKS.map((wb) => (
              <button key={wb.id} onClick={() => { setActiveId(wb.id); setActiveSheet(0); }}
                style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '9px 12px', border: 'none', background: activeId === wb.id ? 'var(--brand-subtle)' : 'transparent', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)', transition: 'background var(--duration-fast)' }}
                onMouseEnter={(e) => { if (activeId !== wb.id) e.currentTarget.style.background = 'var(--surface-hover)'; }}
                onMouseLeave={(e) => { if (activeId !== wb.id) e.currentTarget.style.background = 'transparent'; }}>
                <div style={{ font: 'var(--font-label)', color: activeId === wb.id ? 'var(--brand-text)' : 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{wb.name}</div>
                <div style={{ font: 'var(--font-caption)', color: 'var(--text-tertiary)' }}>{wb.rows} rows · {wb.updated}</div>
              </button>
            ))}
          </div>

          {/* Main area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderBottom: '1px solid var(--border-default)', background: 'var(--surface-card)', flexShrink: 0 }}>
              <span style={{ font: 'var(--font-body-strong)', color: 'var(--text-primary)', marginRight: '4px' }}>{active?.name}</span>
              <div style={{ flex: 1 }} />
              {[
                { icon: 'Upload', label: 'Import CSV' },
                { icon: 'Table', label: 'Import Excel' },
                { icon: 'Cloud', label: 'Cloud import' },
                { icon: 'PlusSquare', label: 'Add sheet' },
              ].map(({ icon, label }) => (
                <Button key={label} variant="ghost" size="sm" iconLeft={<Ic n={icon} size={13} />}>{label}</Button>
              ))}
            </div>

            {/* Sheet tabs */}
            <div style={{ display: 'flex', gap: '0', padding: '0', borderBottom: '1px solid var(--border-default)', background: 'var(--surface-inset)', flexShrink: 0 }}>
              {active?.sheets.map((s, i) => (
                <button key={i} onClick={() => setActiveSheet(i)}
                  style={{ padding: '7px 14px', border: 'none', borderRight: '1px solid var(--border-subtle)', background: activeSheet === i ? 'var(--surface-card)' : 'transparent', font: 'var(--font-body)', fontWeight: activeSheet === i ? 600 : 400, color: activeSheet === i ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer', borderBottom: activeSheet === i ? '2px solid var(--brand)' : '2px solid transparent', marginBottom: '-1px', transition: 'color var(--duration-fast)' }}>
                  {s}
                </button>
              ))}
            </div>

            {/* Spreadsheet */}
            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
              <Spreadsheet cols={COLS_ORDERS} rows={ROWS_ORDERS} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  window.Workbooks = Workbooks;
})();
