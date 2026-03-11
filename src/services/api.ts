import axios from 'axios';

const API_URL = (typeof import.meta !== 'undefined' && (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL) || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ─── Injecter le token JWT ────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('boutique_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Gérer les erreurs 401 ────────────────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('boutique_token');
      localStorage.removeItem('boutique_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Helper : extraire le tableau de données de façon sécurisée ───────────────
// Le backend retourne { success: true, count: N, data: [...] }
// Cette fonction garantit toujours un tableau
export function extractList<T>(res: { data: unknown }): T[] {
  const body = res.data as Record<string, unknown>;
  const d = body?.data;
  if (Array.isArray(d)) return d as T[];
  return [];
}

// ─── Helper : extraire un objet unique ───────────────────────────────────────
export function extractOne<T>(res: { data: unknown }): T | null {
  const body = res.data as Record<string, unknown>;
  const d = body?.data;
  if (d && typeof d === 'object' && !Array.isArray(d)) return d as T;
  return null;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/change-password', { currentPassword, newPassword }),
};

// ─── Agents ───────────────────────────────────────────────────────────────────
export const agentsAPI = {
  getAll: () => api.get('/users/agents'),
  create: (data: { name: string; email: string; password: string; phone?: string }) =>
    api.post('/users/agents', data),
  delete: (id: number | string) => api.delete(`/users/agents/${id}`),
  getSales: (id: number | string) => api.get(`/users/agents/${id}/sales`),
  toggleActive: (id: number | string) => api.patch(`/users/agents/${id}/toggle`),
};

// ─── Produits ─────────────────────────────────────────────────────────────────
export const productsAPI = {
  getAll: () => api.get('/products'),
  getOne: (id: number | string) => api.get(`/products/${id}`),
  create: (data: object) => api.post('/products', data),
  update: (id: number | string, data: object) => api.put(`/products/${id}`, data),
  delete: (id: number | string) => api.delete(`/products/${id}`),
};

// ─── Ventes ───────────────────────────────────────────────────────────────────
export const salesAPI = {
  getAll: () => api.get('/sales'),
  getMine: () => api.get('/sales/mine'),
  create: (data: object) => api.post('/sales', data),
  cancel: (id: number | string) => api.patch(`/sales/${id}/cancel`),
};

// ─── Stock ────────────────────────────────────────────────────────────────────
export const stockAPI = {
  getMovements: () => api.get('/stock'),
  addMovement: (data: object) => api.post('/stock', data),
};


// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardAPI = {
  getStats: () => api.get('/dashboard'),
  getAgentStats: () => api.get('/dashboard/agent'),
};

export default api;
