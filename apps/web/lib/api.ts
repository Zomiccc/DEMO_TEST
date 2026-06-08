const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

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
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
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
      body: JSON.stringify(body),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  placeOrder: (body: any, token: string) =>
    fetcher<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${token}` },
    }),
  orders: (token: string) =>
    fetcher<Order[]>('/orders', { headers: { Authorization: `Bearer ${token}` } }),
  login: (body: { email: string; password: string }) =>
    fetcher<{ accessToken: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify(body), credentials: 'include' }),
  register: (body: any) =>
    fetcher<{ accessToken: string; user: any }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
};
