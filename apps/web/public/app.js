// Tandoor storefront — talks to the NestJS API when available,
// otherwise falls back to seeded sample data so the UI always renders.
const API = 'http://localhost:4000/api';

const SAMPLE = {
  categories: [
    { id: 'all', name: 'All' },
    { id: 'burgers', name: 'Burgers' },
    { id: 'pizzas', name: 'Pizzas' },
    { id: 'sides', name: 'Sides' },
    { id: 'drinks', name: 'Drinks' },
  ],
  products: [
    { id: 'p1', name: 'Classic Beef Burger', categoryId: 'burgers', basePrice: 899.99, isFeatured: true,
      description: 'Juicy beef patty, cheese, lettuce & house sauce.', img: '🍔' },
    { id: 'p2', name: 'Crispy Zinger Burger', categoryId: 'burgers', basePrice: 749, description: 'Crunchy fried chicken fillet, mayo, lettuce.', img: '🍗' },
    { id: 'p3', name: 'Margherita Pizza', categoryId: 'pizzas', basePrice: 1199, isFeatured: true, description: 'Tomato, mozzarella & fresh basil.', img: '🍕' },
    { id: 'p4', name: 'Pepperoni Pizza', categoryId: 'pizzas', basePrice: 1499, description: 'Loaded pepperoni & extra cheese.', img: '🍕' },
    { id: 'p5', name: 'Loaded Fries', categoryId: 'sides', basePrice: 399, description: 'Fries topped with cheese & jalapeños.', img: '🍟' },
    { id: 'p6', name: 'Chicken Wings', categoryId: 'sides', basePrice: 599, description: '6 pcs spicy buffalo wings.', img: '🍗' },
    { id: 'p7', name: 'Fresh Lemonade', categoryId: 'drinks', basePrice: 199, description: 'Chilled minty lemonade.', img: '🥤' },
    { id: 'p8', name: 'Cola', categoryId: 'drinks', basePrice: 120, description: 'Ice-cold 500ml.', img: '🥤' },
  ],
};

const EMOJI = ['🍔','🍕','🍟','🍗','🥤','🌮','🍜','🥗'];
let state = { categories: [], products: [], activeCat: 'all', search: '', cart: [], live: false };

const rs = (n) => 'Rs. ' + Number(n).toLocaleString('en-PK', { maximumFractionDigits: 0 });

async function boot() {
  await loadData();
  renderCategories();
  renderGrid();
  document.getElementById('search').addEventListener('input', (e) => {
    state.search = e.target.value.toLowerCase();
    renderGrid();
  });
}

async function loadData() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    const [catRes, prodRes] = await Promise.all([
      fetch(`${API}/categories`, { signal: ctrl.signal }),
      fetch(`${API}/products`, { signal: ctrl.signal }),
    ]);
    clearTimeout(t);
    if (!catRes.ok || !prodRes.ok) throw new Error('bad status');
    const cats = await catRes.json();
    const prods = await prodRes.json();
    const items = Array.isArray(prods) ? prods : prods.items ?? [];
    state.categories = [{ id: 'all', name: 'All' }, ...cats.map((c) => ({ id: c.id, name: c.name }))];
    state.products = items.map((p, i) => ({
      id: p.id, name: p.name, categoryId: p.categoryId, basePrice: Number(p.basePrice),
      description: p.description ?? '', isFeatured: p.isFeatured, img: EMOJI[i % EMOJI.length],
    }));
    state.live = true;
    setBadge(true);
  } catch {
    state.categories = SAMPLE.categories;
    state.products = SAMPLE.products;
    state.live = false;
    setBadge(false);
  }
}

function setBadge(live) {
  const el = document.getElementById('apiBadge');
  if (live) { el.textContent = '● live API'; el.className = 'ml-2 text-[11px] px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200'; }
  else { el.textContent = '● demo data'; el.className = 'ml-2 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200'; }
}

function renderCategories() {
  const bar = document.getElementById('catBar');
  bar.innerHTML = state.categories.map((c) => `
    <button data-cat="${c.id}" onclick="setCat('${c.id}')"
      class="whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition ${c.id === state.activeCat ? 'bg-brand-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}">
      ${c.name}
    </button>`).join('');
}

function setCat(id) { state.activeCat = id; renderCategories(); renderGrid(); }

function renderGrid() {
  const grid = document.getElementById('grid');
  let items = state.products;
  if (state.activeCat !== 'all') items = items.filter((p) => p.categoryId === state.activeCat);
  if (state.search) items = items.filter((p) => p.name.toLowerCase().includes(state.search));

  document.getElementById('resultMeta').textContent =
    `${items.length} item${items.length !== 1 ? 's' : ''}` + (state.live ? ' · from live API' : ' · demo menu (start the API for live data)');

  grid.innerHTML = items.map((p, i) => `
    <div class="fadeup bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-lg transition" style="animation-delay:${i * 30}ms">
      <div class="h-32 bg-gradient-to-br from-stone-100 to-stone-200 grid place-items-center text-6xl">${p.img || '🍽️'}</div>
      <div class="p-4">
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-bold leading-snug">${p.name}</h3>
          ${p.isFeatured ? '<span class="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">★</span>' : ''}
        </div>
        <p class="text-stone-500 text-sm mt-1 line-clamp-2 h-10 overflow-hidden">${p.description}</p>
        <div class="mt-3 flex items-center justify-between">
          <span class="font-extrabold text-brand-600">${rs(p.basePrice)}</span>
          <button onclick='addToCart(${JSON.stringify({ id: p.id, name: p.name, price: p.basePrice }).replace(/'/g, "&#39;")})'
            class="bg-stone-900 hover:bg-brand-600 text-white text-sm font-semibold rounded-lg px-3 py-1.5 transition">Add +</button>
        </div>
      </div>
    </div>`).join('') || `<p class="text-stone-400 col-span-full py-12 text-center">No dishes match your search.</p>`;
}

function addToCart(item) {
  const existing = state.cart.find((c) => c.id === item.id);
  if (existing) existing.qty++;
  else state.cart.push({ ...item, qty: 1 });
  renderCart();
  toggleCart(true);
}

function changeQty(id, d) {
  const it = state.cart.find((c) => c.id === id);
  if (!it) return;
  it.qty += d;
  if (it.qty <= 0) state.cart = state.cart.filter((c) => c.id !== id);
  renderCart();
}

function renderCart() {
  const wrap = document.getElementById('cartItems');
  const count = state.cart.reduce((s, c) => s + c.qty, 0);
  const subtotal = state.cart.reduce((s, c) => s + c.qty * c.price, 0);
  document.getElementById('cartCount').textContent = count;
  document.getElementById('cartSubtotal').textContent = rs(subtotal);
  document.getElementById('cartTotal').textContent = rs(subtotal);

  wrap.innerHTML = state.cart.length ? state.cart.map((c) => `
    <div class="flex items-center gap-3">
      <div class="w-12 h-12 rounded-xl bg-stone-100 grid place-items-center text-2xl">🍽️</div>
      <div class="flex-1">
        <p class="font-semibold text-sm">${c.name}</p>
        <p class="text-stone-500 text-xs">${rs(c.price)}</p>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="changeQty('${c.id}',-1)" class="w-7 h-7 rounded-lg bg-stone-100 font-bold">−</button>
        <span class="w-5 text-center text-sm font-semibold">${c.qty}</span>
        <button onclick="changeQty('${c.id}',1)" class="w-7 h-7 rounded-lg bg-stone-100 font-bold">+</button>
      </div>
    </div>`).join('') : '<p class="text-stone-400 text-center py-12">Your cart is empty.</p>';
}

function toggleCart(open) {
  document.getElementById('cartOverlay').classList.toggle('hidden', !open);
  document.getElementById('cartPanel').classList.toggle('translate-x-full', !open);
}

function checkout() {
  if (!state.cart.length) return alert('Your cart is empty.');
  const total = state.cart.reduce((s, c) => s + c.qty * c.price, 0);
  alert(`Order placed! 🎉\nTotal: ${rs(total)}\n\n(${state.live ? 'Live API connected' : 'Demo mode'} — full checkout flow lives at POST /api/orders)`);
  state.cart = [];
  renderCart();
  toggleCart(false);
}

boot();
