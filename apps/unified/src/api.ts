const API_BASE = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || '/api';
export const BRANCH_ID = '6bc8bfce-b6b8-43a4-9b2a-6b5211aa6729';

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  basePrice: number;
  isAvailable: boolean;
  isFeatured: boolean;
  imageUrl?: string;
  categoryId: string;
  variants?: ProductVariant[];
  addons?: ProductAddon[];
}

export interface ProductVariant {
  id: string;
  name: string;
  priceDelta: number;
  isDefault: boolean;
}

export interface ProductAddon {
  id: string;
  name: string;
  price: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  children?: Category[];
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  items?: OrderItem[];
  address?: Address;
  riderId?: string;
  type?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  variantName?: string;
}

export interface Address {
  id: string;
  label: string;
  line1: string;
  line2?: string;
  city: string;
  area?: string;
  lat?: number;
  lng?: number;
}

async function fetcher<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  categories: () => fetcher<Category[]>('/categories'),
  products: (params?: { search?: string; categoryId?: string; featured?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.categoryId) qs.set('categoryId', params.categoryId);
    if (params?.featured) qs.set('featured', 'true');
    return fetcher<{ items: Product[]; total: number }>(`/products?${qs}`);
  },
  product: (id: string) => fetcher<Product>(`/products/${id}`),
  branches: () => fetcher<any[]>('/branches'),
  deliveryQuote: (body: { branchId: string; lat: number; lng: number }) =>
    fetcher<any>('/delivery/quote', { method: 'POST', body: JSON.stringify(body) }),
  checkout: (body: any, token?: string) =>
    fetcher<any>('/orders/checkout', {
      method: 'POST',
      body: JSON.stringify({ branchId: BRANCH_ID, ...body }),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  placeOrder: (body: any, token: string) =>
    fetcher<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify({ branchId: BRANCH_ID, ...body }),
      headers: { Authorization: `Bearer ${token}` },
    }),
  orders: (token: string) =>
    fetcher<Order[]>('/orders', { headers: { Authorization: `Bearer ${token}` } }),
  orderDetail: (id: string, token: string) =>
    fetcher<Order>(`/orders/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
  login: (body: { email: string; password: string }) =>
    fetcher<{ accessToken: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify(body), credentials: 'include' }),
  register: (body: any) =>
    fetcher<{ accessToken: string; user: any }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  myAddresses: (token: string) =>
    fetcher<Address[]>('/users/me/addresses', { headers: { Authorization: `Bearer ${token}` } }),
  me: (token: string) =>
    fetcher<any>('/users/me', { headers: { Authorization: `Bearer ${token}` } }),

  // Rider
  riderMe: (token: string) =>
    fetcher<any>('/riders/me', { headers: { Authorization: `Bearer ${token}` } }),
  riderOnline: (online: boolean, token: string) =>
    fetcher<any>('/riders/me/online', { method: 'PATCH', body: JSON.stringify({ online }), headers: { Authorization: `Bearer ${token}` } }),
  riderLocation: (body: { lat: number; lng: number; heading?: number; speed?: number }, token: string) =>
    fetcher<any>('/riders/me/location', { method: 'POST', body: JSON.stringify(body), headers: { Authorization: `Bearer ${token}` } }),
  riderEarnings: (token: string) =>
    fetcher<any[]>('/riders/me/earnings', { headers: { Authorization: `Bearer ${token}` } }),
  updateOrderStatus: (id: string, status: string, token: string) =>
    fetcher<any>(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }), headers: { Authorization: `Bearer ${token}` } }),

  // POS / Cashier
  posOrder: (body: any, token: string) =>
    fetcher<any>('/pos', { method: 'POST', body: JSON.stringify({ branchId: BRANCH_ID, ...body }), headers: { Authorization: `Bearer ${token}` } }),

  // KDS
  kdsQueue: (token: string) =>
    fetcher<any[]>('/kds/queue', { headers: { Authorization: `Bearer ${token}` } }),
  kdsAction: (id: string, action: string, token: string) =>
    fetcher<any>(`/kds/${id}/${action}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),

  // Manager
  analytics: (token: string) =>
    fetcher<any>('/analytics/overview', { headers: { Authorization: `Bearer ${token}` } }),
  inventory: (token: string) =>
    fetcher<any[]>('/inventory', { headers: { Authorization: `Bearer ${token}` } }),
  allOrders: (token: string) =>
    fetcher<Order[]>('/orders', { headers: { Authorization: `Bearer ${token}` } }),
};

export const rs = (n: number) => 'Rs. ' + Number(n).toLocaleString('en-PK', { maximumFractionDigits: 0 });

