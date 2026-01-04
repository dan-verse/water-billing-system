import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/token/', credentials),
  getCurrentUser: () => api.get('/accounts/users/me/'),
};

// Users API
export const usersAPI = {
  getAll: (params) => api.get('/accounts/users/', { params }),
  getById: (id) => api.get(`/accounts/users/${id}/`),
  create: (data) => api.post('/accounts/users/', data),
  update: (id, data) => api.put(`/accounts/users/${id}/`, data),
  delete: (id) => api.delete(`/accounts/users/${id}/`),
  register: (data) => api.post('/accounts/users/register/', data),
  getCustomers: () => api.get('/accounts/users/customers/'),
  getUserBills: (id) => api.get(`/accounts/users/${id}/bills/`),
};

// Meter Readings API
export const meterReadingsAPI = {
  getAll: (params) => api.get('/accounts/meter-readings/', { params }),
  getById: (id) => api.get(`/accounts/meter-readings/${id}/`),
  create: (data) => api.post('/accounts/meter-readings/', data),
  update: (id, data) => api.put(`/accounts/meter-readings/${id}/`, data),
  delete: (id) => api.delete(`/accounts/meter-readings/${id}/`),
  getAnomalies: () => api.get('/accounts/meter-readings/anomalies/'),
  getLatest: () => api.get('/accounts/meter-readings/latest/'),
  generateBill: (id) => api.post(`/accounts/meter-readings/${id}/generate_bill/`),
};

// Bills API
export const billsAPI = {
  getAll: (params) => api.get('/accounts/bills/', { params }),
  getById: (id) => api.get(`/accounts/bills/${id}/`),
  create: (data) => api.post('/accounts/bills/', data),
  update: (id, data) => api.put(`/accounts/bills/${id}/`, data),
  delete: (id) => api.delete(`/accounts/bills/${id}/`),
  getPending: () => api.get('/accounts/bills/pending/'),
  getOverdue: () => api.get('/accounts/bills/overdue/'),
  applyLateFee: (id) => api.post(`/accounts/bills/${id}/apply_late_fee/`),
  cancel: (id) => api.post(`/accounts/bills/${id}/cancel/`),
};

// Payments API
export const paymentsAPI = {
  getAll: (params) => api.get('/accounts/payments/', { params }),
  getById: (id) => api.get(`/accounts/payments/${id}/`),
  create: (data) => api.post('/accounts/payments/', data),
  update: (id, data) => api.put(`/accounts/payments/${id}/`, data),
  delete: (id) => api.delete(`/accounts/payments/${id}/`),
  verify: (id) => api.post(`/accounts/payments/${id}/verify/`),
  getRecent: () => api.get('/accounts/payments/recent/'),
};

// Water Rates API
export const ratesAPI = {
  getAll: (params) => api.get('/accounts/rates/', { params }),
  getById: (id) => api.get(`/accounts/rates/${id}/`),
  create: (data) => api.post('/accounts/rates/', data),
  update: (id, data) => api.put(`/accounts/rates/${id}/`, data),
  delete: (id) => api.delete(`/accounts/rates/${id}/`),
  getCurrent: () => api.get('/accounts/rates/current/'),
};

// Notifications API
export const notificationsAPI = {
  getAll: () => api.get('/accounts/notifications/'),
  getById: (id) => api.get(`/accounts/notifications/${id}/`),
  getUnread: () => api.get('/accounts/notifications/unread/'),
  markRead: (id) => api.post(`/accounts/notifications/${id}/mark_read/`),
  markAllRead: () => api.post('/accounts/notifications/mark_all_read/'),
};

// Dashboard API
export const dashboardAPI = {
  getSummary: () => api.get('/accounts/dashboard/summary/'),
  getRecentActivity: () => api.get('/accounts/dashboard/recent_activity/'),
  getUsageAnalytics: () => api.get('/accounts/dashboard/usage_analytics/'),
};

export default api;