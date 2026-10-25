import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('eloan_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('eloan_token');
      localStorage.removeItem('eloan_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export function formatPHP(amount: number | string | undefined): string {
  if (amount === undefined || amount === null) return '₱0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatDatePH(dateString: string | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00+08:00');
    return d.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Manila'
    });
  } catch (e) {
    return dateString;
  }
}
