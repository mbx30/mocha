// Fake print-shop data for the Frappe UI kit. Plain globals (no modules).
window.FrappeData = (function () {
  const orders = [
    { id: 1048, customer: 'Acme Co.', contact: 'Dana Ruiz', job: '500 matte business cards', qty: 500, stock: '16pt Matte', status: 'press', total: 184.00, due: 'Today, 4:00pm', rush: true, stage: 'On press', assignees: ['Max Bowen'] },
    { id: 1047, customer: 'Northwind Cafe', contact: 'Priya Shah', job: 'A-frame sidewalk banner', qty: 2, stock: '13oz Vinyl', status: 'art', total: 240.00, due: 'Tomorrow', rush: false, stage: 'Awaiting art', assignees: ['Dana Ruiz'] },
    { id: 1046, customer: 'Lumen Studio', contact: 'Lee Ortiz', job: 'Tri-fold brochures', qty: 1000, stock: '100lb Gloss', status: 'queued', total: 612.50, due: 'Fri', rush: false, stage: 'Queued', assignees: [] },
    { id: 1045, customer: 'Harbor Yoga', contact: 'Sam Kade', job: 'Vinyl window decals', qty: 12, stock: 'Cut Vinyl', status: 'queued', total: 96.00, due: 'Fri', rush: false, stage: 'Prepress', assignees: ['Priya Shah'] },
    { id: 1044, customer: 'Acme Co.', contact: 'Dana Ruiz', job: 'Letterhead reprint', qty: 250, stock: '70lb Uncoated', status: 'shipped', total: 78.00, due: 'Shipped', rush: false, stage: 'Shipped', assignees: ['Max Bowen'] },
    { id: 1043, customer: 'Pine & Oak', contact: 'Jo Tran', job: 'Foil wedding invites', qty: 120, stock: '120lb Cotton', status: 'press', total: 540.00, due: 'Mon', rush: false, stage: 'Bindery', assignees: ['Lee Ortiz', 'Sam Kade'] },
    { id: 1042, customer: 'Bright Labs', contact: 'Avery Cole', job: 'Roll-up retractable banner', qty: 1, stock: 'Polyester', status: 'overdue', total: 159.00, due: 'Overdue 1d', rush: true, stage: 'On press', assignees: ['Max Bowen'] },
    { id: 1041, customer: 'Cedar Dental', contact: 'Rae Kim', job: 'Appointment cards', qty: 2000, stock: '14pt Gloss', status: 'queued', total: 220.00, due: 'Next Tue', rush: false, stage: 'Queued', assignees: [] },
  ];

  const invoices = [
    { id: 'INV-2048', customer: 'Acme Co.', order: 1048, amount: 184.00, status: 'sent', date: 'Jun 18', deposit: 50, qbStatus: 'not_synced' },
    { id: 'INV-2047', customer: 'Northwind Cafe', order: 1047, amount: 240.00, status: 'paid', date: 'Jun 17', deposit: 240, qbStatus: 'synced' },
    { id: 'INV-2046', customer: 'Bright Labs', order: 1042, amount: 159.00, status: 'overdue', date: 'Jun 10', deposit: 0, qbStatus: 'sync_error' },
    { id: 'INV-2045', customer: 'Pine & Oak', order: 1043, amount: 540.00, status: 'deposit', date: 'Jun 15', deposit: 270, qbStatus: 'not_synced' },
    { id: 'INV-2044', customer: 'Lumen Studio', order: 1046, amount: 612.50, status: 'draft', date: '—', deposit: 0, qbStatus: 'not_synced' },
    { id: 'INV-2043', customer: 'Acme Co.', order: 1044, amount: 78.00, status: 'paid', date: 'Jun 12', deposit: 78, qbStatus: 'synced' },
  ];

  const estimates = [
    { id: 'EST-00312', customer: 'Harbor Yoga', items: 3, total: 320.00, status: 'sent', validUntil: 'Jul 5', created: 'Jun 14' },
    { id: 'EST-00311', customer: 'Acme Co.', items: 4, total: 1840.00, status: 'approved', validUntil: 'Jun 30', created: 'Jun 12' },
    { id: 'EST-00310', customer: 'Pine & Oak', items: 6, total: 2240.00, status: 'draft', validUntil: 'Jul 15', created: 'Jun 10' },
    { id: 'EST-00309', customer: 'Bright Labs', items: 2, total: 890.00, status: 'rejected', validUntil: 'Jun 15', created: 'Jun 1' },
    { id: 'EST-00308', customer: 'Cedar Dental', items: 2, total: 220.00, status: 'converted', validUntil: 'Jun 1', created: 'May 28' },
    { id: 'EST-00307', customer: 'Lumen Studio', items: 5, total: 1440.00, status: 'sent', validUntil: 'Jul 8', created: 'May 25' },
  ];

  // Sample line items for an open estimate editor
  const estimateLineItems = [
    { id: 1, category: 'labor', description: 'Design & prepress setup', qty: 2, unitPrice: 85.00 },
    { id: 2, category: 'materials', description: '16pt Matte card stock (500 sheets)', qty: 500, unitPrice: 0.18 },
    { id: 3, category: 'finishing', description: 'UV coating (one side)', qty: 500, unitPrice: 0.12 },
  ];

  const clients = [
    { id: 1, name: 'Dana Ruiz', company: 'Acme Co.', email: 'dana@acme.com', phone: '(555) 010-1001', tags: 'regular,wholesale', status: 'active', lastContacted: 'Jun 18' },
    { id: 2, name: 'Priya Shah', company: 'Northwind Cafe', email: 'priya@northwindcafe.com', phone: '(555) 010-1002', tags: 'cafe,signage', status: 'active', lastContacted: 'Jun 17' },
    { id: 3, name: 'Lee Ortiz', company: 'Lumen Studio', email: 'lee@lumenstudio.co', phone: '(555) 010-1003', tags: 'design,premium', status: 'active', lastContacted: 'Jun 10' },
    { id: 4, name: 'Sam Kade', company: 'Harbor Yoga', email: 'sam@harboryoga.com', phone: '(555) 010-1004', tags: '', status: 'active', lastContacted: 'Jun 14' },
    { id: 5, name: 'Jo Tran', company: 'Pine & Oak', email: 'jo@pineandoak.com', phone: '(555) 010-1005', tags: 'wedding,specialty', status: 'active', lastContacted: 'Jun 15' },
    { id: 6, name: 'Avery Cole', company: 'Bright Labs', email: 'avery@brightlabs.io', phone: '(555) 010-1006', tags: '', status: 'inactive', lastContacted: 'May 20' },
    { id: 7, name: 'Rae Kim', company: 'Cedar Dental', email: 'rae@cedardental.com', phone: '(555) 010-1007', tags: 'medical,recurring', status: 'active', lastContacted: 'Jun 8' },
  ];

  const inventory = [
    { id: 1, material: '16pt Matte', size: '8.5×11"', attributes: 'C2S', qty: 2400, unit: 'sheets', reorderLevel: 500, status: 'normal', stockPct: 100, lastRestocked: 'Jun 10' },
    { id: 2, material: '14pt Gloss', size: '8.5×11"', attributes: 'C2S', qty: 180, unit: 'sheets', reorderLevel: 500, status: 'low', stockPct: 36, lastRestocked: 'May 28' },
    { id: 3, material: '13oz Vinyl', size: '54" roll', attributes: 'Outdoor', qty: 42, unit: 'sq ft', reorderLevel: 100, status: 'critical', stockPct: 42, lastRestocked: 'May 15' },
    { id: 4, material: '100lb Gloss Text', size: '8.5×11"', attributes: 'C2S', qty: 1800, unit: 'sheets', reorderLevel: 400, status: 'normal', stockPct: 100, lastRestocked: 'Jun 5' },
    { id: 5, material: 'Foil Stock', size: '8.5×11"', attributes: 'Silver/Gold', qty: 320, unit: 'sheets', reorderLevel: 200, status: 'normal', stockPct: 100, lastRestocked: 'Jun 1' },
    { id: 6, material: '70lb Uncoated', size: '8.5×11"', attributes: 'Offset', qty: 55, unit: 'sheets', reorderLevel: 300, status: 'critical', stockPct: 18, lastRestocked: 'Apr 20' },
    { id: 7, material: 'Polyester Banner', size: '60" roll', attributes: 'UV resistant', qty: 280, unit: 'sq ft', reorderLevel: 150, status: 'normal', stockPct: 100, lastRestocked: 'May 30' },
    { id: 8, material: '120lb Cotton', size: '8.5×11"', attributes: 'Textured', qty: 150, unit: 'sheets', reorderLevel: 100, status: 'normal', stockPct: 100, lastRestocked: 'Jun 3' },
  ];

  // Kanban columns for production
  const columns = [
    { key: 'Queued', tone: 'info' },
    { key: 'Prepress', tone: 'brand' },
    { key: 'On press', tone: 'brand' },
    { key: 'Bindery', tone: 'warning' },
    { key: 'Shipped', tone: 'success' },
  ];

  const statusBadge = {
    queued:  { tone: 'info', label: 'Queued' },
    art:     { tone: 'warning', label: 'Awaiting art' },
    press:   { tone: 'brand', label: 'On press' },
    shipped: { tone: 'success', label: 'Shipped' },
    overdue: { tone: 'danger', label: 'Overdue' },
  };

  const invoiceBadge = {
    draft:   { tone: 'neutral', label: 'Draft' },
    sent:    { tone: 'info', label: 'Sent' },
    paid:    { tone: 'success', label: 'Paid' },
    overdue: { tone: 'danger', label: 'Overdue' },
    deposit: { tone: 'warning', label: 'Deposit paid' },
  };

  const estimateBadge = {
    draft:     { tone: 'neutral', label: 'Draft' },
    sent:      { tone: 'info', label: 'Sent' },
    approved:  { tone: 'success', label: 'Approved' },
    rejected:  { tone: 'danger', label: 'Rejected' },
    converted: { tone: 'brand', label: 'Converted' },
  };

  const qbStatusBadge = {
    not_synced:  { tone: 'neutral', label: 'Not synced' },
    synced:      { tone: 'success', label: 'Synced' },
    sync_error:  { tone: 'danger', label: 'Sync error' },
    pending:     { tone: 'warning', label: 'Pending' },
  };

  const money = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return { orders, invoices, estimates, estimateLineItems, clients, inventory, columns, statusBadge, invoiceBadge, estimateBadge, qbStatusBadge, money };
})();
