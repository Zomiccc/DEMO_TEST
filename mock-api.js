const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory data stores
const users = [];
const categories = [
  { id: 'cat-1', name: 'Burgers', slug: 'burgers', description: 'Juicy burgers', sortOrder: 1, isActive: true, parentId: null },
  { id: 'cat-2', name: 'Pizzas', slug: 'pizzas', description: 'Fresh pizzas', sortOrder: 2, isActive: true, parentId: null },
  { id: 'cat-3', name: 'Sides', slug: 'sides', description: 'Tasty sides', sortOrder: 3, isActive: true, parentId: null },
  { id: 'cat-4', name: 'Drinks', slug: 'drinks', description: 'Refreshing drinks', sortOrder: 4, isActive: true, parentId: null },
];
const products = [
  { id: 'p1', name: 'Classic Burger', slug: 'classic-burger', description: 'Beef patty with lettuce, tomato, and cheese', basePrice: 599, categoryId: 'cat-1', image: '', isActive: true, variants: [], addons: [] },
  { id: 'p2', name: 'Double Cheeseburger', slug: 'double-cheeseburger', description: 'Two beef patties, double cheese, special sauce', basePrice: 899, categoryId: 'cat-1', image: '', isActive: true, variants: [], addons: [] },
  { id: 'p3', name: 'Margherita Pizza', slug: 'margherita-pizza', description: 'Tomato sauce, mozzarella, fresh basil', basePrice: 799, categoryId: 'cat-2', image: '', isActive: true, variants: [], addons: [] },
  { id: 'p4', name: 'Pepperoni Pizza', slug: 'pepperoni-pizza', description: 'Tomato sauce, mozzarella, pepperoni', basePrice: 999, categoryId: 'cat-2', image: '', isActive: true, variants: [], addons: [] },
  { id: 'p5', name: 'Fries', slug: 'fries', description: 'Crispy golden fries', basePrice: 249, categoryId: 'cat-3', image: '', isActive: true, variants: [], addons: [] },
  { id: 'p6', name: 'Onion Rings', slug: 'onion-rings', description: 'Crispy battered onion rings', basePrice: 349, categoryId: 'cat-3', image: '', isActive: true, variants: [], addons: [] },
  { id: 'p7', name: 'Coca Cola', slug: 'coca-cola', description: 'Chilled 500ml', basePrice: 149, categoryId: 'cat-4', image: '', isActive: true, variants: [], addons: [] },
  { id: 'p8', name: 'Fresh Lemonade', slug: 'fresh-lemonade', description: 'Homemade lemonade', basePrice: 199, categoryId: 'cat-4', image: '', isActive: true, variants: [], addons: [] },
];
const orders = [];
const posOrders = [];
const riderLocations = {};

function genId() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function genToken() { return 'mock_' + Math.random().toString(36).slice(2); }

// ─── Auth ───
app.post('/api/auth/register', (req, res) => {
  const { email, password, name, phone, role } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  if (users.find(u => u.email === email)) return res.status(409).json({ message: 'Email already registered' });
  const user = { id: genId(), email, password, name: name || email.split('@')[0], phone: phone || '', role: role || 'CUSTOMER', createdAt: new Date().toISOString() };
  users.push(user);
  const token = genToken();
  user.token = token;
  res.status(201).json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, token });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const token = genToken();
  user.token = token;
  res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, token });
});

app.get('/api/auth/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = users.find(u => u.token === token);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

// ─── Catalog ───
app.get('/api/categories', (req, res) => {
  res.json(categories.filter(c => c.isActive));
});

app.get('/api/products', (req, res) => {
  const { categoryId, search, page = '1', limit = '20' } = req.query;
  let result = products.filter(p => p.isActive);
  if (categoryId) result = result.filter(p => p.categoryId === categoryId);
  if (search) {
    const s = search.toString().toLowerCase();
    result = result.filter(p => p.name.toLowerCase().includes(s) || p.description.toLowerCase().includes(s));
  }
  const p = parseInt(page), l = parseInt(limit);
  res.json({ data: result.slice((p - 1) * l, p * l), meta: { total: result.length, page: p, limit: l, totalPages: Math.ceil(result.length / l) } });
});

app.get('/api/products/:id', (req, res) => {
  const p = products.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ message: 'Not found' });
  res.json(p);
});

// ─── Orders ───
app.get('/api/orders', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = users.find(u => u.token === token);
  const userOrders = orders.filter(o => !user || o.userId === user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(userOrders);
});

app.post('/api/orders', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = users.find(u => u.token === token);
  const { items, type, address, paymentMethod, branchId } = req.body;
  const order = {
    id: genId(),
    userId: user?.id || 'guest',
    items: items || [],
    type: type || 'DELIVERY',
    status: 'PENDING',
    address: address || '',
    paymentMethod: paymentMethod || 'CASH_ON_DELIVERY',
    branchId: branchId || 'demo-branch',
    total: (items || []).reduce((s, i) => s + (i.price * i.quantity), 0) + 0,
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  res.status(201).json(order);
});

app.get('/api/orders/:id', (req, res) => {
  const o = orders.find(x => x.id === req.params.id);
  if (!o) return res.status(404).json({ message: 'Not found' });
  res.json(o);
});

app.patch('/api/orders/:id/status', (req, res) => {
  const o = orders.find(x => x.id === req.params.id);
  if (!o) return res.status(404).json({ message: 'Not found' });
  o.status = req.body.status || o.status;
  res.json(o);
});

// ─── POS ───
app.post('/api/pos', (req, res) => {
  const { items, type, tableNumber, paymentMethod, branchId } = req.body;
  const order = {
    id: genId(),
    items: items || [],
    type: type || 'DINE_IN',
    tableNumber: tableNumber || null,
    status: 'PENDING',
    paymentMethod: paymentMethod || 'CASH',
    branchId: branchId || 'demo-branch',
    total: (items || []).reduce((s, i) => s + (i.price * i.quantity), 0),
    createdAt: new Date().toISOString(),
  };
  posOrders.push(order);
  res.status(201).json(order);
});

// ─── Rider ───
app.get('/api/riders/me/orders', (req, res) => {
  // Return a mix of assigned and available orders for demo
  const available = orders.filter(o => o.status === 'READY' || o.status === 'ASSIGNED' || o.status === 'PICKED_UP' || o.status === 'ON_THE_WAY');
  res.json(available.length ? available : []);
});

app.post('/api/riders/me/location', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  riderLocations[token] = req.body;
  res.json({ success: true });
});

app.post('/api/riders/me/orders/:id/status', (req, res) => {
  const o = orders.find(x => x.id === req.params.id);
  if (!o) return res.status(404).json({ message: 'Not found' });
  o.status = req.body.status || o.status;
  res.json(o);
});

// ─── Delivery ───
app.post('/api/delivery/quote', (req, res) => {
  const { lat, lng } = req.body;
  const distance = Math.sqrt(lat * lat + lng * lng) * 0.01; // fake distance
  let fee = 0;
  if (distance > 10) fee = Math.round(distance * 50);
  else if (distance > 7) fee = 200;
  res.json({ distance: Math.round(distance * 100) / 100, fee, estimatedMinutes: Math.round(distance * 5 + 10) });
});

// ─── Health ───
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ─── Seed a demo user ───
users.push({ id: 'demo-user', email: 'demo@rms.local', password: 'demo123', name: 'Demo User', phone: '03001234567', role: 'CUSTOMER', token: 'demo_token', createdAt: new Date().toISOString() });
users.push({ id: 'demo-rider', email: 'rider@rms.local', password: 'rider123', name: 'Demo Rider', phone: '03001234568', role: 'RIDER', token: 'rider_token', createdAt: new Date().toISOString() });
users.push({ id: 'demo-cashier', email: 'cashier@rms.local', password: 'cashier123', name: 'Demo Cashier', phone: '03001234569', role: 'CASHIER', token: 'cashier_token', createdAt: new Date().toISOString() });

// Seed some orders
orders.push({ id: 'ord-1', userId: 'demo-user', items: [{ productId: 'p1', name: 'Classic Burger', quantity: 2, price: 599 }], type: 'DELIVERY', status: 'DELIVERED', address: '123 Main St', paymentMethod: 'CASH_ON_DELIVERY', branchId: 'demo-branch', total: 1198, createdAt: new Date(Date.now() - 86400000).toISOString() });
orders.push({ id: 'ord-2', userId: 'demo-user', items: [{ productId: 'p3', name: 'Margherita Pizza', quantity: 1, price: 799 }], type: 'DELIVERY', status: 'ON_THE_WAY', address: '456 Oak Ave', paymentMethod: 'WALLET', branchId: 'demo-branch', total: 799, createdAt: new Date(Date.now() - 3600000).toISOString() });

const PORT = 4000;
app.listen(PORT, () => console.log(`[mock-api] Running on http://localhost:${PORT}`));
app.on('error', (err) => console.error('[mock-api] Error:', err));
