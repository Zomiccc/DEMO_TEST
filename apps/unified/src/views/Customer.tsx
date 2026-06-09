import { useEffect, useState, type ReactNode } from 'react';
import { api, rs, type Product, type Category, type Order, type Address } from '../api';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-stone-100 text-stone-600',
  CONFIRMED: 'bg-blue-50 text-blue-600',
  PREPARING: 'bg-amber-50 text-amber-600',
  READY: 'bg-purple-50 text-purple-600',
  ASSIGNED: 'bg-indigo-50 text-indigo-600',
  PICKED_UP: 'bg-sky-50 text-sky-600',
  ON_THE_WAY: 'bg-cyan-50 text-cyan-600',
  DELIVERED: 'bg-green-50 text-green-600',
  CANCELLED: 'bg-red-50 text-red-600',
};

const EMOJI_MAP: Record<string, string> = {
  burgers: '🍔', pizzas: '🍕', appetizers: '🍟', pasta: '🍝', drinks: '🥤', desserts: '🍰', deals: '🎁',
};

interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  variantName?: string;
  addons?: string[];
}

export default function CustomerView({ screen, token }: { screen: string; token: string }) {
  const [categories, setCategories] = useState<Category[]>([{ id: 'all', name: 'All', slug: 'all' }]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeCat, setActiveCat] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [innerView, setInnerView] = useState<'home' | 'product' | 'checkout' | 'track' | 'orders'>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productQty, setProductQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [pricing, setPricing] = useState<any>(null);
  const [placing, setPlacing] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [orderType, setOrderType] = useState<'DELIVERY' | 'PICKUP' | 'DINE_IN'>('DELIVERY');
  const [promoCode, setPromoCode] = useState('');
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH_ON_DELIVERY' | 'JAZZCASH' | 'EASYPAISA' | 'CARD' | 'WALLET'>('CASH_ON_DELIVERY');
  const [payProcessing, setPayProcessing] = useState(false);
  const [payStep, setPayStep] = useState<'method' | 'details' | 'processing' | 'success'>('method');
  const [walletBalance] = useState(2450);
  // Fake payment form states
  const [jazzPhone, setJazzPhone] = useState('');
  const [jazzPin, setJazzPin] = useState('');
  const [easyPhone, setEasyPhone] = useState('');
  const [easyOtp, setEasyOtp] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem('cart');
    if (raw) setCart(JSON.parse(raw));
  }, []);

  useEffect(() => {
    setInnerView('home');
    setSelectedProduct(null);
    setPricing(null);
    setSelectedVariant('');
    setSelectedAddons([]);
    setTrackingOrder(null);
  }, [screen]);

  useEffect(() => {
    if (screen !== 'home') return;
    api.categories().then((cats) => setCatsSafe(cats)).catch(() => setCatsSafe([]));
  }, [screen]);

  useEffect(() => {
    if (screen !== 'home') return;
    setLoading(true);
    const params: any = { search };
    if (activeCat !== 'all') params.categoryId = activeCat;
    api.products(params).then((d) => { setProducts(d.items); setLoading(false); }).catch(() => { setProducts([]); setLoading(false); });
  }, [screen, activeCat, search]);

  useEffect(() => {
    if (screen !== 'orders') return;
    if (!token) { setOrders([]); return; }
    api.orders(token).then(setOrders).catch(() => setOrders([]));
  }, [screen, token]);

  useEffect(() => {
    if (!token) return;
    api.myAddresses(token).then(setAddresses).catch(() => setAddresses([]));
  }, [token]);

  const setCatsSafe = (cats: Category[]) => {
    setCategories([{ id: 'all', name: 'All', slug: 'all' }, ...cats]);
  };

  const saveCart = (next: CartItem[]) => {
    setCart(next);
    localStorage.setItem('cart', JSON.stringify(next));
  };

  const currentPrice = (p: Product) => {
    let price = p.basePrice;
    const v = p.variants?.find((x) => x.name === selectedVariant);
    if (v) price += v.priceDelta;
    const addonPrices = (p.addons || []).filter((a) => selectedAddons.includes(a.name)).reduce((s, a) => s + a.price, 0);
    return price + addonPrices;
  };

  const addToCart = (p: Product, qty = 1) => {
    const price = currentPrice(p);
    const next = [...cart];
    const ex = next.find((i) => i.productId === p.id && i.variantName === selectedVariant);
    if (ex) ex.qty += qty;
    else next.push({ productId: p.id, name: p.name + (selectedVariant ? ` (${selectedVariant})` : ''), price, qty, variantName: selectedVariant || undefined, addons: [...selectedAddons] });
    saveCart(next);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const changeQty = (id: string, delta: number) => {
    const next = cart.map((i) => i.productId === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i).filter((i) => i.qty > 0);
    saveCart(next);
  };

  const removeFromCart = (id: string) => saveCart(cart.filter((i) => i.productId !== id));

  const cartSubtotal = cart.reduce((s, i) => s + i.qty * i.price, 0);

  const openProduct = (p: Product) => {
    setSelectedProduct(p);
    setProductQty(1);
    setSelectedVariant(p.variants?.find((v) => v.isDefault)?.name || '');
    setSelectedAddons([]);
    setInnerView('product');
  };

  const calcCheckout = async () => {
    if (!token || cart.length === 0) return;
    try {
      const res = await api.checkout({
        type: orderType,
        items: cart.map((i) => ({ productId: i.productId, quantity: i.qty })),
        promoCode: promoCode || undefined,
        addressId: orderType === 'DELIVERY' ? selectedAddress : undefined,
      }, token);
      setPricing(res);
    } catch { /* ignore */ }
  };

  const placeOrder = async () => {
    if (!token) { alert('Please log in first'); return; }
    setPlacing(true);
    try {
      const order = await api.placeOrder({
        type: orderType,
        items: cart.map((i) => ({ productId: i.productId, quantity: i.qty })),
        paymentMethod,
        addressId: orderType === 'DELIVERY' ? selectedAddress : undefined,
        promoCode: promoCode || undefined,
      }, token);
      saveCart([]);
      alert(`Order placed! ${order.orderNumber}`);
      setInnerView('home');
      setPayStep('method');
      setJazzPhone(''); setJazzPin(''); setEasyPhone(''); setEasyOtp('');
      setCardNumber(''); setCardExpiry(''); setCardCvv(''); setCardName('');
    } catch (e: any) {
      alert(e.message ?? 'Failed to place order');
    }
    setPlacing(false);
  };

  const simulatePayment = async () => {
    setPayProcessing(true);
    setPayStep('processing');
    await new Promise((r) => setTimeout(r, 2000));
    setPayProcessing(false);
    setPayStep('success');
    await new Promise((r) => setTimeout(r, 800));
    placeOrder();
  };

  const openTrack = (o: Order) => { setTrackingOrder(o); setInnerView('track'); };

  if (innerView === 'track' && trackingOrder) {
    const lat = trackingOrder.address?.lat ?? 31.5104;
    const lng = trackingOrder.address?.lng ?? 74.3487;
    return (
      <div className="w-full px-4 lg:px-8 py-6 space-y-4">
        <button onClick={() => setInnerView('orders')} className="text-sm text-stone-500 hover:text-brand-600 font-medium">← Back to orders</button>
        <h1 className="text-xl font-extrabold">Track Order {trackingOrder.orderNumber}</h1>
        <div className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${STATUS_COLORS[trackingOrder.status] ?? ''}`}>{trackingOrder.status}</div>
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <iframe
            width="100%" height="300" style={{ border: 0 }}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.02}%2C${lat - 0.02}%2C${lng + 0.02}%2C${lat + 0.02}&layer=mapnik&marker=${lat}%2C${lng}`}
            title="Delivery Map"
          />
        </div>
        <p className="text-sm text-stone-500">Delivery location: {trackingOrder.address?.line1}, {trackingOrder.address?.city}</p>
        <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-2">
          {trackingOrder.items?.map((it, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span>{it.productName} × {it.quantity}</span>
              <span className="font-semibold">{rs(Number(it.lineTotal))}</span>
            </div>
          ))}
          <div className="border-t pt-2 flex justify-between font-extrabold"><span>Total</span><span>{rs(Number(trackingOrder.total))}</span></div>
        </div>
      </div>
    );
  }

  if (innerView === 'checkout') {
    const total = pricing?.total ?? cartSubtotal;
    const cardType = cardNumber.startsWith('4') ? 'visa' : cardNumber.startsWith('5') ? 'mastercard' : cardNumber.startsWith('3') ? 'amex' : null;

    const methodStyles: Record<string, { border: string; bg: string; text: string; dot: string }> = {
      CASH_ON_DELIVERY: { border: 'border-green-500', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
      JAZZCASH: { border: 'border-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
      EASYPAISA: { border: 'border-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
      CARD: { border: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
      WALLET: { border: 'border-violet-500', bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
    };

    const PaymentMethodCard = ({ id, label, icon, desc, active }: { id: typeof paymentMethod; label: string; icon: ReactNode; desc: string; active: boolean }) => {
      const st = methodStyles[id];
      return (
        <button onClick={() => { setPaymentMethod(id); setPayStep('details'); }}
          className={`flex items-center gap-3 w-full p-3 rounded-xl border-2 text-left transition ${active ? `${st.border} ${st.bg}` : 'border-stone-200 hover:border-stone-300 bg-white'}`}>
          <div className="shrink-0">{icon}</div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold ${active ? st.text : 'text-stone-800'}`}>{label}</p>
            <p className="text-xs text-stone-500 truncate">{desc}</p>
          </div>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${active ? st.border : 'border-stone-300'}`}>
            {active && <div className={`w-2.5 h-2.5 rounded-full ${st.dot}`} />}
          </div>
        </button>
      );
    };

    return (
      <div className="w-full px-4 lg:px-8 py-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => { setInnerView('home'); setPayStep('method'); }} className="text-stone-500 hover:text-brand-600 text-sm font-medium">← Back</button>
        </div>
        <h1 className="text-2xl font-extrabold">Checkout</h1>
        {cart.length === 0 ? <p className="text-stone-400">Your cart is empty.</p> : (
          <div className="space-y-4">
            {/* Order Type */}
            <div className="flex gap-2">
              {(['DELIVERY', 'PICKUP', 'DINE_IN'] as const).map((t) => (
                <button key={t} onClick={() => setOrderType(t)} className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${orderType === t ? 'bg-brand-500 text-white' : 'bg-stone-100 text-stone-600'}`}>
                  {t.replace('_', ' ')}
                </button>
              ))}
            </div>

            {orderType === 'DELIVERY' && (
              <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-2">
                <p className="text-sm font-semibold">Delivery Address</p>
                {addresses.length === 0 ? <p className="text-xs text-stone-400">No saved addresses</p> : addresses.map((a) => (
                  <label key={a.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${selectedAddress === a.id ? 'border-brand-500 bg-brand-50' : 'border-stone-200'}`}>
                    <input type="radio" name="addr" checked={selectedAddress === a.id} onChange={() => setSelectedAddress(a.id)} />
                    <div className="text-sm"><p className="font-medium">{a.label}</p><p className="text-stone-500 text-xs">{a.line1}, {a.city}</p></div>
                  </label>
                ))}
              </div>
            )}

            {/* Promo Code */}
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <p className="text-sm font-semibold mb-2">Promo Code</p>
              <div className="flex gap-2">
                <input type="text" placeholder="Enter code" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} className="flex-1 bg-stone-100 rounded-lg px-3 py-2 text-sm" />
                <button onClick={calcCheckout} className="bg-stone-900 text-white text-xs font-bold rounded-lg px-4">Apply</button>
              </div>
            </div>

            {/* Cart Items */}
            {cart.map((i) => (
              <div key={i.productId} className="flex justify-between bg-white rounded-xl border border-stone-200 p-4">
                <span className="font-medium text-sm">{i.name} × {i.qty}</span>
                <span className="font-semibold text-sm">{rs(i.qty * i.price)}</span>
              </div>
            ))}

            {/* Order Summary */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
              <div className="flex justify-between text-sm"><span className="text-stone-500">Subtotal</span><span className="font-semibold">{rs(pricing?.subtotal ?? cartSubtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-stone-500">Delivery</span><span className="font-semibold text-green-600">{pricing?.deliveryFee ? rs(pricing.deliveryFee) : 'Free'}</span></div>
              {pricing?.discount > 0 && <div className="flex justify-between text-sm"><span className="text-stone-500">Discount</span><span className="font-semibold text-green-600">−{rs(pricing.discount)}</span></div>}
              <div className="flex justify-between text-base font-extrabold border-t pt-3"><span>Total</span><span>{rs(total)}</span></div>
            </div>

            {/* Payment Method Selection */}
            {payStep === 'method' && (
              <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
                <p className="text-sm font-bold text-stone-800">Select Payment Method</p>
                <div className="space-y-2">
                  <PaymentMethodCard id="CASH_ON_DELIVERY" label="Cash on Delivery" icon="💵" desc="Pay when your order arrives" active={paymentMethod === 'CASH_ON_DELIVERY'} />
                  <PaymentMethodCard id="JAZZCASH" label="JazzCash" icon={<img src="/logos/jazzcash.png" className="h-7 w-auto" alt="JazzCash" />} desc="Pay via JazzCash Mobile Account" active={paymentMethod === 'JAZZCASH'} />
                  <PaymentMethodCard id="EASYPAISA" label="EasyPaisa" icon={<img src="/logos/easypaisa.png" className="h-7 w-auto" alt="EasyPaisa" />} desc="Pay via EasyPaisa Mobile Account" active={paymentMethod === 'EASYPAISA'} />
                  <PaymentMethodCard id="CARD" label="Credit / Debit Card" icon="💳" desc="Visa, Mastercard, PayPak" active={paymentMethod === 'CARD'} />
                  <PaymentMethodCard id="WALLET" label="Wallet Balance" icon="👛" desc={`Rs. ${walletBalance.toLocaleString()} available`} active={paymentMethod === 'WALLET'} />
                </div>
              </div>
            )}

            {/* JazzCash Payment Form */}
            {payStep === 'details' && paymentMethod === 'JAZZCASH' && (
              <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <img src="/logos/jazzcash.png" className="h-8 w-auto" alt="JazzCash" />
                  <div>
                    <p className="text-sm font-bold text-orange-700">JazzCash Payment</p>
                    <p className="text-xs text-stone-500">Secure payment via JazzCash Mobile Account</p>
                  </div>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-orange-800">JazzCash Mobile Number</label>
                    <input type="tel" placeholder="03XX XXXXXXX" value={jazzPhone} onChange={(e) => setJazzPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      className="w-full mt-1 bg-white border border-orange-200 rounded-lg px-3 py-2 text-sm font-mono" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-orange-800">MPIN</label>
                    <input type="password" placeholder="••••" maxLength={4} value={jazzPin} onChange={(e) => setJazzPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full mt-1 bg-white border border-orange-200 rounded-lg px-3 py-2 text-sm font-mono tracking-widest" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPayStep('method')} className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-stone-200 text-stone-600">Back</button>
                  <button onClick={simulatePayment} disabled={jazzPhone.length < 11 || jazzPin.length < 4 || payProcessing}
                    className="flex-[2] bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-xl py-2.5 text-sm transition">
                    {payProcessing ? 'Processing...' : `Pay ${rs(total)}`}
                  </button>
                </div>
              </div>
            )}

            {/* EasyPaisa Payment Form */}
            {payStep === 'details' && paymentMethod === 'EASYPAISA' && (
              <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <img src="/logos/easypaisa.png" className="h-8 w-auto" alt="EasyPaisa" />
                  <div>
                    <p className="text-sm font-bold text-emerald-700">EasyPaisa Payment</p>
                    <p className="text-xs text-stone-500">Secure payment via EasyPaisa Mobile Account</p>
                  </div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-emerald-800">EasyPaisa Mobile Number</label>
                    <input type="tel" placeholder="03XX XXXXXXX" value={easyPhone} onChange={(e) => setEasyPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      className="w-full mt-1 bg-white border border-emerald-200 rounded-lg px-3 py-2 text-sm font-mono" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-emerald-800">OTP Code</label>
                    <input type="text" placeholder="XXXXXX" maxLength={6} value={easyOtp} onChange={(e) => setEasyOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full mt-1 bg-white border border-emerald-200 rounded-lg px-3 py-2 text-sm font-mono tracking-widest" />
                    <p className="text-xs text-emerald-600 mt-1">Enter the 6-digit code sent to your number</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPayStep('method')} className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-stone-200 text-stone-600">Back</button>
                  <button onClick={simulatePayment} disabled={easyPhone.length < 11 || easyOtp.length < 6 || payProcessing}
                    className="flex-[2] bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded-xl py-2.5 text-sm transition">
                    {payProcessing ? 'Processing...' : `Pay ${rs(total)}`}
                  </button>
                </div>
              </div>
            )}

            {/* Card Payment Form */}
            {payStep === 'details' && paymentMethod === 'CARD' && (
              <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">💳</span>
                  <div>
                    <p className="text-sm font-bold text-blue-700">Card Payment</p>
                    <p className="text-xs text-stone-500">Visa, Mastercard, PayPak — Secure 3D checkout</p>
                  </div>
                </div>
                {/* Card Preview */}
                <div className="relative bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl p-5 text-white shadow-lg">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-10 h-7 bg-amber-200/80 rounded" />
                    <span className="text-xs font-bold uppercase tracking-wider opacity-70">{cardType ? cardType : 'CARD'}</span>
                  </div>
                  <p className="text-xl font-mono tracking-[0.15em] mb-4">
                    {cardNumber ? cardNumber.replace(/(\d{4})(?!$)/g, '$1 ') : '•••• •••• •••• ••••'}
                  </p>
                  <div className="flex justify-between">
                    <div>
                      <p className="text-[10px] uppercase opacity-60">Card Holder</p>
                      <p className="text-xs font-semibold truncate max-w-[140px]">{cardName || 'YOUR NAME'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase opacity-60">Expires</p>
                      <p className="text-xs font-semibold">{cardExpiry || 'MM/YY'}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-stone-700">Card Number</label>
                    <input type="text" placeholder="1234 5678 9012 3456" value={cardNumber} maxLength={19}
                      onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').slice(0, 19))}
                      className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm font-mono" />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-stone-700">Expiry</label>
                      <input type="text" placeholder="MM/YY" maxLength={5} value={cardExpiry}
                        onChange={(e) => {
                          let v = e.target.value.replace(/\D/g, '');
                          if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2, 4);
                          setCardExpiry(v);
                        }}
                        className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm font-mono" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-stone-700">CVV</label>
                      <input type="password" placeholder="•••" maxLength={4} value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm font-mono tracking-widest" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-stone-700">Card Holder Name</label>
                    <input type="text" placeholder="AS PER CARD" value={cardName}
                      onChange={(e) => setCardName(e.target.value.toUpperCase())}
                      className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm font-semibold tracking-wide" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPayStep('method')} className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-stone-200 text-stone-600">Back</button>
                  <button onClick={simulatePayment} disabled={cardNumber.length < 16 || cardExpiry.length < 5 || cardCvv.length < 3 || !cardName || payProcessing}
                    className="flex-[2] bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl py-2.5 text-sm transition">
                    {payProcessing ? 'Processing...' : `Pay ${rs(total)}`}
                  </button>
                </div>
              </div>
            )}

            {/* Wallet Payment */}
            {payStep === 'details' && paymentMethod === 'WALLET' && (
              <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">👛</span>
                  <div>
                    <p className="text-sm font-bold text-violet-700">Wallet Payment</p>
                    <p className="text-xs text-stone-500">Pay using your in-app wallet balance</p>
                  </div>
                </div>
                <div className="bg-violet-50 rounded-xl p-4 text-center">
                  <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider">Available Balance</p>
                  <p className="text-3xl font-extrabold text-violet-700 mt-1">Rs. {walletBalance.toLocaleString()}</p>
                  <p className="text-xs text-violet-500 mt-1">Order total: Rs. {total.toLocaleString()}</p>
                  <p className="text-xs text-violet-500">Remaining after: Rs. {(walletBalance - total).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPayStep('method')} className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-stone-200 text-stone-600">Back</button>
                  <button onClick={simulatePayment} disabled={walletBalance < total || payProcessing}
                    className="flex-[2] bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold rounded-xl py-2.5 text-sm transition">
                    {payProcessing ? 'Processing...' : `Pay ${rs(total)}`}
                  </button>
                </div>
              </div>
            )}

            {/* COD Confirmation */}
            {payStep === 'details' && paymentMethod === 'CASH_ON_DELIVERY' && (
              <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">💵</span>
                  <div>
                    <p className="text-sm font-bold text-green-700">Cash on Delivery</p>
                    <p className="text-xs text-stone-500">Pay cash when your order is delivered</p>
                  </div>
                </div>
                <div className="bg-green-50 rounded-xl p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 text-lg">✓</span>
                    <p className="text-sm text-green-800">Keep exact change ready: <strong>{rs(total)}</strong></p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 text-lg">✓</span>
                    <p className="text-sm text-green-800">Our rider will call before arrival</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 text-lg">✓</span>
                    <p className="text-sm text-green-800">No extra delivery fee for COD orders</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPayStep('method')} className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-stone-200 text-stone-600">Back</button>
                  <button onClick={placeOrder} disabled={placing}
                    className="flex-[2] bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-xl py-2.5 text-sm transition">
                    {placing ? 'Placing...' : 'Confirm Order'}
                  </button>
                </div>
              </div>
            )}

            {/* Processing Overlay */}
            {payStep === 'processing' && (
              <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center space-y-3">
                <div className="w-12 h-12 border-4 border-stone-200 border-t-brand-500 rounded-full animate-spin mx-auto" />
                <p className="text-sm font-bold text-stone-700">Processing Payment...</p>
                <p className="text-xs text-stone-500">Please do not close this window</p>
                <p className="text-xs text-stone-400 font-mono">Txn Ref: RMS-{Date.now().toString(36).toUpperCase()}</p>
              </div>
            )}

            {/* Success */}
            {payStep === 'success' && (
              <div className="bg-white rounded-2xl border border-green-200 p-8 text-center space-y-3">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-2xl">✓</span>
                </div>
                <p className="text-sm font-bold text-green-700">Payment Successful!</p>
                <p className="text-xs text-stone-500">Placing your order now...</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (innerView === 'product' && selectedProduct) {
    const price = currentPrice(selectedProduct);
    return (
      <div className="w-full px-4 lg:px-8 py-6">
        <button onClick={() => setInnerView('home')} className="text-sm text-stone-500 hover:text-brand-600 mb-4 inline-block font-medium">← Back to menu</button>
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="h-56 bg-gradient-to-br from-stone-100 to-stone-200 grid place-items-center text-8xl">
            {EMOJI_MAP[categories.find((c) => c.id === selectedProduct.categoryId)?.slug || ''] || '🍽️'}
          </div>
          <div className="p-6">
            <h1 className="text-2xl font-extrabold">{selectedProduct.name}</h1>
            <p className="text-stone-500 mt-2">{selectedProduct.description}</p>

            {selectedProduct.variants && selectedProduct.variants.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold mb-2">Size / Variant</p>
                <div className="flex gap-2 flex-wrap">
                  {selectedProduct.variants.map((v) => (
                    <button key={v.name} onClick={() => setSelectedVariant(v.name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${selectedVariant === v.name ? 'bg-brand-500 text-white' : 'bg-stone-100 text-stone-600'}`}>
                      {v.name} {v.priceDelta > 0 ? `+${rs(v.priceDelta)}` : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedProduct.addons && selectedProduct.addons.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold mb-2">Add-ons</p>
                <div className="space-y-2">
                  {selectedProduct.addons.map((a) => (
                    <label key={a.name} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={selectedAddons.includes(a.name)} onChange={() => setSelectedAddons((prev) => prev.includes(a.name) ? prev.filter((x) => x !== a.name) : [...prev, a.name])} />
                      <span className="text-sm">{a.name} (+{rs(a.price)})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <button onClick={() => setProductQty(Math.max(1, productQty - 1))} className="w-9 h-9 rounded-lg bg-stone-100 font-bold text-lg">−</button>
              <span className="w-6 text-center font-semibold">{productQty}</span>
              <button onClick={() => setProductQty(productQty + 1)} className="w-9 h-9 rounded-lg bg-stone-100 font-bold text-lg">+</button>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <span className="text-2xl font-extrabold text-brand-600">{rs(price * productQty)}</span>
              <button onClick={() => { addToCart(selectedProduct, productQty); }} className="bg-stone-900 hover:bg-brand-600 text-white font-semibold rounded-xl px-6 py-3 transition">
                {added ? 'Added!' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'cart') {
    return (
      <div className="w-full px-4 lg:px-8 py-6 space-y-4">
        <h1 className="text-2xl font-extrabold">Your Cart</h1>
        {cart.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-stone-400 mb-4">Your cart is empty.</p>
            <span className="inline-block text-stone-400 text-sm">Switch to the Menu tab to browse</span>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {cart.map((i) => (
                <div key={i.productId} className="flex items-center gap-4 bg-white rounded-2xl border border-stone-200 p-4">
                  <div className="w-12 h-12 rounded-xl bg-stone-100 grid place-items-center text-2xl">🍽️</div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{i.name}</p>
                    <p className="text-stone-500 text-xs">{rs(i.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => changeQty(i.productId, -1)} className="w-7 h-7 rounded-lg bg-stone-100 font-bold">−</button>
                    <span className="w-5 text-center text-sm font-semibold">{i.qty}</span>
                    <button onClick={() => changeQty(i.productId, 1)} className="w-7 h-7 rounded-lg bg-stone-100 font-bold">+</button>
                  </div>
                  <button onClick={() => removeFromCart(i.productId)} className="text-stone-400 hover:text-red-500 text-sm">Remove</button>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
              <div className="flex justify-between text-sm"><span className="text-stone-500">Subtotal</span><span className="font-semibold">{rs(cartSubtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-stone-500">Delivery</span><span className="font-semibold text-green-600">Calculated at checkout</span></div>
              <div className="flex justify-between text-base font-extrabold border-t pt-3"><span>Total</span><span>{rs(cartSubtotal)}</span></div>
              <button onClick={() => { setInnerView('checkout'); calcCheckout(); }} className="block w-full text-center bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl py-3 transition">Proceed to Checkout</button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (screen === 'orders') {
    return (
      <div className="w-full px-4 lg:px-8 py-6 space-y-4">
        <h1 className="text-2xl font-extrabold">My Orders</h1>
        {orders.length === 0 ? <p className="text-stone-400">No orders yet.</p> : (
          <div className="space-y-4">
            {orders.map((o) => (
              <div key={o.id} className="bg-white rounded-2xl border border-stone-200 p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm">{o.orderNumber}</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[o.status] ?? 'bg-stone-100 text-stone-600'}`}>{o.status.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-stone-500 text-sm">{new Date(o.createdAt).toLocaleDateString('en-PK')}</p>
                <div className="mt-3 flex justify-between items-center">
                  <span className="font-extrabold text-brand-600">{rs(Number(o.total))}</span>
                  <button onClick={() => openTrack(o)} className="text-sm font-medium text-brand-600 hover:underline">Track</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const filtered = products;
  return (
    <>
      <section className="bg-gradient-to-br from-brand-500 to-brand-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14">
          <p className="uppercase tracking-widest text-brand-100 text-xs font-semibold mb-3">Free delivery within 5 km</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight max-w-2xl">Crave it. Tap it. <br/>We deliver it hot.</h1>
          <p className="mt-4 text-brand-100 max-w-lg text-sm">Fresh from the kitchen to your door. Real-time tracking, wallet, and loyalty points.</p>
        </div>
      </section>

      <nav className="bg-white border-b border-stone-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map((c) => (
            <button key={c.id} onClick={() => setActiveCat(c.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition ${activeCat === c.id ? 'bg-brand-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
              {EMOJI_MAP[c.slug] || ''} {c.name}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <input type="text" placeholder="Search dishes..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="flex-1 max-w-md bg-stone-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          <p className="text-stone-500 text-sm">{loading ? 'Loading...' : `${filtered.length} items`}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((p) => (
            <button key={p.id} onClick={() => openProduct(p)} className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-lg transition block text-left">
              <div className="h-32 bg-gradient-to-br from-stone-100 to-stone-200 grid place-items-center text-6xl">
                {EMOJI_MAP[categories.find((c) => c.id === p.categoryId)?.slug || ''] || '🍽️'}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold leading-snug text-sm">{p.name}</h3>
                  {p.isFeatured && <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">★</span>}
                </div>
                <p className="text-stone-500 text-sm mt-1 line-clamp-2 h-10 overflow-hidden">{p.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-extrabold text-brand-600">{rs(p.basePrice)}</span>
                  <span className="bg-stone-900 text-white text-sm font-semibold rounded-lg px-3 py-1.5">View</span>
                </div>
              </div>
            </button>
          ))}
          {!loading && filtered.length === 0 && <p className="text-stone-400 col-span-full py-12 text-center">No dishes match your search.</p>}
        </div>
      </main>
    </>
  );
}
