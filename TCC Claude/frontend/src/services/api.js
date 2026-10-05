import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const login = (identifier, senha) =>
  api.post('/api/auth/login', { identifier, senha });

export const register = (data) =>
  api.post('/api/auth/register', data);

export const forgotPassword = (email, cpf_cnpj, recaptchaToken) =>
  api.post('/api/auth/forgot-password', { email, cpf_cnpj, recaptchaToken });

export const verifyCode = (email, code) =>
  api.post('/api/auth/verify-code', { email, code });

export const resetPassword = (resetToken, novaSenha) =>
  api.post('/api/auth/reset-password', { resetToken, novaSenha });

export default api;
