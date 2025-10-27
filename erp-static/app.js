// Minimal state and mock data
const state = {
  route: 'dashboard',
  invoicesFilter: 'all',
  settingsTab: 'company',
  vatRate: 0.20,
};

// Mock datasets
const mock = {
  salesDaily: Array.from({ length: 12 }, (_, i) => ({ label: `Gün ${i+1}`, value: Math.round(Math.random()*1000 + 200) })),
  distribution: [
    { label: 'Tahsilat', value: 6500 },
    { label: 'Gider', value: 3500 },
  ],
  lastTransactions: Array.from({ length: 10 }, (_, i) => ({
    date: new Date(Date.now() - i*86400000).toISOString().slice(0,10),
    desc: ['Satış', 'Tahsilat', 'Gider'][i%3],
    amount: (Math.random()>0.5?1:-1) * (Math.round(Math.random()*900)+100)
  })).reverse(),
  invoices: Array.from({ length: 16 }, (_, i) => ({
    no: 'FAT' + String(1000+i),
    cari: 'Müşteri ' + ((i%6)+1),
    amount: Math.round(Math.random()*4000+200),
    status: ['pending','paid','canceled'][i%3],
    date: new Date(Date.now() - i*172800000).toISOString().slice(0,10),
  })),
  stock: Array.from({ length: 14 }, (_, i) => ({
    code: 'STK' + String(100+i),
    name: 'Ürün ' + (i+1),
    qty: Math.round(Math.random()*12),
    price: Math.round(Math.random()*900 + 50),
    critical: 5,
  })),
  customers: Array.from({ length: 10 }, (_, i) => ({
    id: i+1,
    name: 'Cari ' + (i+1),
    balance: Math.round((Math.random()*4000 - 2000)),
    phone: '05' + Math.floor(100000000 + Math.random()*899999999),
  })),
  cashbank: Array.from({ length: 12 }, (_, i) => ({
    date: new Date(Date.now() - i*86400000).toISOString().slice(0,10),
    desc: ['Kasa giriş','Kasa çıkış','Banka giriş','Banka çıkış'][i%4],
    amount: (i%2===0?1:-1) * (Math.round(Math.random()*1500)+100),
  })),
  incomeExpense: Array.from({ length: 8 }, (_, i) => ({
    date: new Date(Date.now() - i*604800000).toISOString().slice(0,10),
    income: Math.round(Math.random()*5000 + 2000),
    expense: Math.round(Math.random()*3000 + 1000),
    category: ['Satış','Hizmet','Kira','Personel'][i%4],
  })),
  products: Array.from({ length: 20 }, (_, i) => ({
    id: i+1,
    name: 'Ürün ' + (i+1),
    price: Math.round(Math.random()*400 + 20),
    image: '',
  })),
  users: Array.from({ length: 8 }, (_, i) => ({ id: i+1, name: 'Kullanıcı ' + (i+1), email: `user${i+1}@mail.com`, role: ['Admin','Satış','Muhasebe'][i%3] })),
};

// Router
const routes = ['dashboard','invoices','stock','customers','cashbank','incomeexpense','retail','reports','users','settings'];
function setRoute(route) {
  if (!routes.includes(route)) return;
  state.route = route;
  document.querySelectorAll('.sidebar__item').forEach(b => b.classList.toggle('is-active', b.dataset.route === route));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('is-visible'));
  const target = document.getElementById(`view-${route}`);
  if (target) target.classList.add('is-visible');
}

// Helpers
const fmt = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
const fmtNum = new Intl.NumberFormat('tr-TR');

function el(tag, attrs={}, children=[]) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v]) => {
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v);
  });
  children.forEach(c => e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
  return e;
}

// Simple canvas chart renderers (no libs)
function drawBarChart(canvas, data, options={}) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width; const height = canvas.height;
  ctx.clearRect(0,0,width,height);
  const padding = 30; const innerW = width - padding*2; const innerH = height - padding*2;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barW = innerW / data.length * 0.6; const gap = innerW / data.length * 0.4;
  ctx.fillStyle = '#e5e7eb'; ctx.fillRect(padding, padding, innerW, innerH);
  data.forEach((d, i) => {
    const x = padding + i*(barW+gap) + gap/2;
    const h = (d.value / maxVal) * (innerH - 10);
    const y = padding + innerH - h;
    ctx.fillStyle = options.color || '#007aff';
    ctx.fillRect(x, y, barW, h);
  });
}

function drawMiniSpark(canvas, values, color='#007aff') {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width; const h = canvas.height;
  ctx.clearRect(0,0,w,h);
  const maxVal = Math.max(...values, 1);
  const step = w / (values.length - 1);
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = i*step;
    const y = h - (v/maxVal) * (h-4) - 2;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function drawPieChart(canvas, data) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width; const h = canvas.height; const r = Math.min(w,h)/2 - 10;
  const cx = w/2; const cy = h/2;
  const total = data.reduce((s,d)=>s+d.value, 0) || 1;
  const colors = ['#007aff', '#ef4444', '#22c55e', '#f59e0b'];
  let start = -Math.PI/2;
  ctx.clearRect(0,0,w,h);
  data.forEach((d, i) => {
    const angle = (d.value/total) * Math.PI*2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.fillStyle = colors[i % colors.length];
    ctx.arc(cx, cy, r, start, start+angle);
    ctx.closePath();
    ctx.fill();
    start += angle;
  });
}

// Populate Dashboard
function renderDashboard() {
  const totalSales = mock.salesDaily.reduce((s,d)=>s+d.value,0);
  const totalIncome = mock.incomeExpense.reduce((s,d)=>s+d.income,0);
  const totalExpense = mock.incomeExpense.reduce((s,d)=>s+d.expense,0);
  const profit = totalIncome - totalExpense;
  const customersCount = mock.customers.length;
  const receivables = mock.invoices.filter(i=>i.status==='pending').reduce((s,d)=>s+d.amount,0);
  document.getElementById('metric-total-sales').textContent = fmt.format(totalSales);
  document.getElementById('metric-profit').textContent = fmt.format(profit);
  document.getElementById('metric-customers').textContent = fmtNum.format(customersCount);
  document.getElementById('metric-receivables').textContent = fmt.format(receivables);

  drawMiniSpark(document.getElementById('mini-chart-sales'), mock.salesDaily.map(d=>d.value));
  drawMiniSpark(document.getElementById('mini-chart-profit'), mock.incomeExpense.map(d=>d.income - d.expense), '#22c55e');
  drawMiniSpark(document.getElementById('mini-chart-customers'), mock.customers.map((_,i)=> (i+1)*2 ), '#6b7280');
  drawMiniSpark(document.getElementById('mini-chart-receivables'), mock.invoices.filter(i=>i.status==='pending').map(i=>i.amount));

  drawBarChart(document.getElementById('chart-sales'), mock.salesDaily, { color: '#007aff' });
  drawPieChart(document.getElementById('chart-distribution'), mock.distribution);

  const tbody = document.getElementById('last-transactions-body');
  tbody.innerHTML = '';
  mock.lastTransactions.forEach(t => {
    const tr = el('tr', {}, [
      el('td', { class: 'th-left', text: t.date }),
      el('td', { class: 'th-left', text: t.desc }),
      el('td', { class: 'th-right', text: fmt.format(t.amount) }),
    ]);
    tbody.appendChild(tr);
  });
}

// Invoices
function renderInvoices() {
  document.querySelectorAll('#view-invoices .tab').forEach(btn => btn.classList.toggle('is-active', btn.dataset.invtab === state.invoicesFilter));
  const tbody = document.getElementById('invoices-body');
  tbody.innerHTML = '';
  const rows = mock.invoices.filter(inv => state.invoicesFilter==='all' ? true : inv.status===state.invoicesFilter);
  rows.forEach(inv => {
    const tr = el('tr', {}, [
      el('td', { text: inv.no }),
      el('td', { text: inv.cari }),
      el('td', { class: 'th-right', text: fmt.format(inv.amount) }),
      el('td', {}, [ el('span', { class: `badge ${inv.status}` , text: inv.status==='pending'?'Bekleyen':inv.status==='paid'?'Ödenmiş':'İptal' }) ]),
      el('td', { text: inv.date }),
    ]);
    tbody.appendChild(tr);
  });
}

// Stock
function renderStock() {
  const tbody = document.getElementById('stock-body');
  tbody.innerHTML = '';
  mock.stock.forEach(s => {
    const tr = el('tr', {}, [
      el('td', { text: s.code }),
      el('td', { text: s.name }),
      el('td', { text: String(s.qty) }),
      el('td', { class: 'th-right', text: fmt.format(s.price) }),
      el('td', {}, [ s.qty < s.critical ? el('span', { class: 'badge-danger', text: 'Kritik' }) : document.createTextNode('-') ]),
    ]);
    tbody.appendChild(tr);
  });
}

// Customers
let selectedCustomerId = null;
function renderCustomers() {
  const list = document.getElementById('customer-list');
  const summary = document.getElementById('customer-summary');
  const history = document.getElementById('customer-history');
  list.innerHTML = '';
  mock.customers.forEach(c => {
    const item = el('div', { class: 'list-card' + (c.id===selectedCustomerId?' is-active':''), 'data-id': String(c.id) }, [
      el('div', { text: c.name }),
      el('div', { class: 'muted', text: 'Bakiye: ' + fmt.format(c.balance) }),
      el('div', { class: 'muted', text: 'Tel: ' + c.phone }),
    ]);
    item.addEventListener('click', () => { selectedCustomerId = c.id; renderCustomers(); });
    list.appendChild(item);
  });
  const c = mock.customers.find(x => x.id === (selectedCustomerId || mock.customers[0].id));
  selectedCustomerId = c.id;
  summary.innerHTML = '';
  const totals = [
    { t: 'Toplam Borç', v: fmt.format(Math.max(0, -c.balance)) },
    { t: 'Toplam Alacak', v: fmt.format(Math.max(0, c.balance)) },
    { t: 'Bakiye', v: fmt.format(c.balance) },
  ];
  totals.forEach(x => {
    summary.appendChild(el('div', { class: 'small-card small-card--kpi' }, [
      el('div', { class: 'title', text: x.t }),
      el('div', { class: 'value', text: x.v }),
    ]));
  });
  history.innerHTML = '';
  mock.lastTransactions.forEach(t => {
    history.appendChild(el('tr', {}, [
      el('td', { text: t.date }),
      el('td', { text: t.desc }),
      el('td', { class: 'th-right', text: fmt.format(t.amount) }),
    ]));
  });
}

// Cash & Bank
function renderCashBank() {
  const sumCash = mock.cashbank.filter(x=>x.desc.includes('Kasa')).reduce((s,d)=>s+d.amount,0);
  const sumBank = mock.cashbank.filter(x=>x.desc.includes('Banka')).reduce((s,d)=>s+d.amount,0);
  const sumIn = mock.cashbank.filter(x=>x.amount>0).reduce((s,d)=>s+d.amount,0);
  const sumOut = mock.cashbank.filter(x=>x.amount<0).reduce((s,d)=>s+Math.abs(d.amount),0);
  const list = document.getElementById('cashbank-summaries');
  list.innerHTML = '';
  [
    { t: 'Kasa Bakiye', v: fmt.format(sumCash) },
    { t: 'Banka Bakiye', v: fmt.format(sumBank) },
    { t: 'Toplam Giriş', v: fmt.format(sumIn) },
    { t: 'Toplam Çıkış', v: fmt.format(sumOut) },
  ].forEach(x => {
    list.appendChild(el('div', { class: 'small-card small-card--kpi' }, [
      el('div', { class: 'title', text: x.t }),
      el('div', { class: 'value', text: x.v }),
    ]));
  });
  const tbody = document.getElementById('cashbank-table');
  tbody.innerHTML = '';
  mock.cashbank.forEach(r => tbody.appendChild(el('tr', {}, [
    el('td', { text: r.date }),
    el('td', { text: r.desc }),
    el('td', { class: 'th-right', text: fmt.format(r.amount) }),
  ])));
}

// Income Expense
function renderIncomeExpense() {
  const start = document.getElementById('ie-start').value || '1900-01-01';
  const end = document.getElementById('ie-end').value || '2999-12-31';
  const rows = mock.incomeExpense.filter(r => r.date >= start && r.date <= end);
  drawBarChart(
    document.getElementById('chart-incomeexpense'),
    rows.flatMap((r, idx) => ([ { label: r.date + ' Gelir', value: r.income }, { label: r.date + ' Gider', value: r.expense } ])),
    { color: '#007aff' }
  );
  const summary = document.getElementById('ie-summary');
  summary.innerHTML = '';
  const totalIncome = rows.reduce((s,d)=>s+d.income,0);
  const totalExpense = rows.reduce((s,d)=>s+d.expense,0);
  [
    { t: 'Toplam Gelir', v: fmt.format(totalIncome) },
    { t: 'Toplam Gider', v: fmt.format(totalExpense) },
    { t: 'Kar', v: fmt.format(totalIncome - totalExpense) },
  ].forEach(x => summary.appendChild(el('div', { class: 'small-card' }, [ el('div', { class: 'title', text: x.t }), el('div', { class: 'value', text: x.v }) ])));
  const tbody = document.getElementById('ie-table');
  tbody.innerHTML = '';
  rows.forEach(r => tbody.appendChild(el('tr', {}, [
    el('td', { text: r.category }),
    el('td', { class: 'th-right', text: fmt.format(r.income - r.expense) }),
    el('td', { text: r.date }),
  ])));
}

// Retail
const cart = [];
function renderRetail() {
  const grid = document.getElementById('retail-products-grid');
  grid.innerHTML = '';
  mock.products.forEach(p => {
    const card = el('div', { class: 'product-card' });
    const img = el('img', { alt: p.name, src: p.image || '' });
    const name = el('div', { class: 'name', text: `${p.name} - ${fmt.format(p.price)}` });
    card.appendChild(img); card.appendChild(name);
    card.addEventListener('click', () => addToCart(p));
    grid.appendChild(card);
  });
  renderCart();
}
function addToCart(p) {
  const found = cart.find(i=>i.id===p.id);
  if (found) found.qty += 1; else cart.push({ id: p.id, name: p.name, price: p.price, qty: 1 });
  renderCart();
}
function renderCart() {
  const wrap = document.getElementById('cart-items');
  const receipt = document.getElementById('receipt-items');
  wrap.innerHTML = ''; receipt.innerHTML = '';
  let subtotal = 0;
  cart.forEach(i => {
    subtotal += i.price * i.qty;
    const row = el('div', { class: 'cart-row' }, [
      el('div', { text: i.name }),
      el('div', { text: 'x' + i.qty }),
      el('div', { text: fmt.format(i.price * i.qty) }),
    ]);
    const rrow = el('div', { class: 'receipt-row' }, [
      el('div', { text: i.name }),
      el('div', { text: 'x' + i.qty }),
      el('div', { text: fmt.format(i.price * i.qty) }),
    ]);
    wrap.appendChild(row); receipt.appendChild(rrow);
  });
  const vat = subtotal * state.vatRate;
  const total = subtotal + vat;
  document.getElementById('receipt-subtotal').textContent = fmt.format(subtotal);
  document.getElementById('receipt-vat').textContent = fmt.format(vat);
  document.getElementById('receipt-total').textContent = fmt.format(total);
}

// Reports
function renderReports() {
  const tbody = document.getElementById('reports-table');
  tbody.innerHTML = '';
  const data = [
    { name: 'Aylık Satış', value: mock.salesDaily.reduce((s,d)=>s+d.value,0), desc: 'Bu ay toplam satış.' },
    { name: 'Bekleyen Tahsilatlar', value: mock.invoices.filter(i=>i.status==='pending').reduce((s,d)=>s+d.amount,0), desc: 'Ödenmemiş faturalar.' },
  ];
  data.forEach(r => tbody.appendChild(el('tr', {}, [
    el('td', { text: r.name }),
    el('td', { class: 'th-right', text: fmt.format(r.value) }),
    el('td', { text: r.desc }),
  ])));
  drawPieChart(document.getElementById('chart-report'), [ { label: 'Satış', value: data[0].value }, { label: 'Bekleyen', value: data[1].value } ]);
}

// Users
function renderUsers() {
  const list = document.getElementById('user-list');
  list.innerHTML = '';
  mock.users.forEach(u => {
    const item = el('div', { class: 'list-card' }, [
      el('div', { text: u.name }),
      el('div', { class: 'muted', text: `${u.role} • ${u.email}` }),
    ]);
    item.addEventListener('click', () => {
      document.getElementById('user-name').value = u.name;
      document.getElementById('user-email').value = u.email;
      document.getElementById('user-role').value = u.role;
    });
    list.appendChild(item);
  });
}

// Settings
function bindSettingsTabs() {
  document.querySelectorAll('#view-settings .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      state.settingsTab = tab.dataset.settab;
      document.querySelectorAll('#view-settings .tab').forEach(t => t.classList.toggle('is-active', t.dataset.settab===state.settingsTab));
      document.querySelectorAll('#settings-panels .settings-panel').forEach(p => p.classList.toggle('is-visible', p.dataset.panel===state.settingsTab));
    });
  });
}

// Events and initialization
function bindNav() {
  document.querySelectorAll('.sidebar__item').forEach(btn => btn.addEventListener('click', () => setRoute(btn.dataset.route)));
}

function bindInvoicesTabs() {
  document.querySelectorAll('#view-invoices .tab').forEach(btn => btn.addEventListener('click', () => { state.invoicesFilter = btn.dataset.invtab; renderInvoices(); }));
}

function bindIncomeExpenseFilter() {
  const btn = document.getElementById('ie-apply');
  if (btn) btn.addEventListener('click', renderIncomeExpense);
}

function init() {
  bindNav();
  bindInvoicesTabs();
  bindIncomeExpenseFilter();
  bindSettingsTabs();
  renderDashboard();
  renderInvoices();
  renderStock();
  renderCustomers();
  renderCashBank();
  renderIncomeExpense();
  renderRetail();
  renderReports();
}

document.addEventListener('DOMContentLoaded', init);

