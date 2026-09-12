export interface ApiErrorShape {
  code: string;
  message: string;
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err: ApiErrorShape = data?.error ?? { code: 'unknown', message: 'Erro inesperado.' };
    throw new ApiError(res.status, err.code, err.message);
  }
  return data as T;
}

// ---- Types shared with the backend contract ----
export interface User {
  id: number;
  email: string;
}

export interface Product {
  id: number;
  description: string;
  gtin: string | null;
  unit: string;
  balance: number;
}

export interface Movement {
  id: number;
  productId: number;
  type: 'in' | 'out' | 'adjust';
  quantity: number;
  source: 'nfe' | 'manual';
  noteId: number | null;
  createdAt: string;
}

export interface NfeItem {
  description: string;
  gtin: string | null;
  quantity: number;
  unit: string;
  unitValue: number | null;
}

export interface ImportPreview {
  accessKey: string;
  issuedAt: string | null;
  source: string;
  alreadyImported: boolean;
  items: NfeItem[];
}

export const api = {
  // auth
  register: (email: string, password: string) =>
    request<{ user: User }>('POST', '/auth/register', { email, password }),
  login: (email: string, password: string) =>
    request<{ user: User }>('POST', '/auth/login', { email, password }),
  logout: () => request<void>('POST', '/auth/logout'),
  me: () => request<{ user: User }>('GET', '/auth/me'),

  // inventory
  listProducts: () => request<{ products: Product[] }>('GET', '/inventory/products'),
  getProduct: (id: number) => request<{ product: Product }>('GET', `/inventory/products/${id}`),
  updateProduct: (id: number, patch: Partial<Pick<Product, 'description' | 'gtin' | 'unit'>>) =>
    request<{ product: Product }>('PATCH', `/inventory/products/${id}`, patch),
  listMovements: (id: number) =>
    request<{ movements: Movement[] }>('GET', `/inventory/products/${id}/movements`),
  addMovement: (id: number, type: 'in' | 'out', quantity: number) =>
    request<{ movement: Movement }>('POST', `/inventory/products/${id}/movements`, { type, quantity }),
  adjust: (id: number, balance: number) =>
    request<{ movement: Movement }>('POST', `/inventory/products/${id}/adjust`, { balance }),

  // nfe
  preview: (code: string) => request<{ preview: ImportPreview }>('POST', '/nfe/preview', { code }),
  previewXml: (xml: string) => request<{ preview: ImportPreview }>('POST', '/nfe/preview-xml', { xml }),
  confirm: (payload: { accessKey: string; issuedAt?: string | null; source: string; items: NfeItem[] }) =>
    request<{ result: { noteId: number; itemsImported: number; productsCreated: number } }>(
      'POST',
      '/nfe/confirm',
      payload,
    ),
};
