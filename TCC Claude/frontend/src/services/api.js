import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Conta desativada, removida ou token inválido: encerra a sessão e volta para o login com o aviso
api.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    const url = erro.config?.url || '';
    if (erro.response?.status === 401 && sessionStorage.getItem('token') && !url.includes('/api/auth/')) {
      sessionStorage.setItem('sf_aviso', erro.response.data?.message || 'Sessão encerrada. Entre novamente.');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      window.location.assign('/');
    }
    return Promise.reject(erro);
  }
);

export const login = (identifier, senha) =>
  api.post('/api/auth/login', { identifier, senha });

export const register = (data) =>
  api.post('/api/auth/register', data);

// Recuperação de senha (sem sessão)
export const buscarContaRecuperacao = (identificador, recaptchaToken) =>
  api.post('/api/auth/recuperacao/buscar', { identificador, recaptchaToken });
export const enviarCodigoRecuperacao = (busca_token) =>
  api.post('/api/auth/recuperacao/enviar-codigo', { busca_token });
export const verificarCodigoRecuperacao = (busca_token, codigo) =>
  api.post('/api/auth/recuperacao/verificar-codigo', { busca_token, codigo });
export const redefinirSenhaRecuperacao = (reset_token, nova_senha) =>
  api.post('/api/auth/recuperacao/redefinir-senha', { reset_token, nova_senha });

// Perfil e notificações
export const getProfile = () => api.get('/api/profile');
export const updateEmailRecuperacao = (data) => api.put('/api/profile/email-recuperacao', data);
export const listNotificacoes = () => api.get('/api/notificacoes');
export const marcarNotificacoesLidas = () => api.post('/api/notificacoes/marcar-lidas');
export const dispensarNotificacao = (id) => api.post(`/api/notificacoes/${id}/dispensar`);

export const listProducts = () => api.get('/api/products');
export const lookupBarcode = (codigo) => api.get(`/api/products/barcode/${encodeURIComponent(codigo)}`);
export const createProduct = (data) => api.post('/api/products', data);
export const deleteProduct = (id) => api.delete(`/api/products/${id}`);
export const withdrawProduct = (id, quantidade) => api.post(`/api/products/${id}/withdraw`, { quantidade });

export const listMovements = (params) => api.get('/api/movements', { params });
export const listMovementUsers = () => api.get('/api/movements/users');
export const getReport = (from, to) => api.get('/api/reports', { params: { from, to } });

export const listUsers = () => api.get('/api/users');
export const createUser = (data) => api.post('/api/users', data);
export const updateUserRole = (id, role) => api.put(`/api/users/${id}/role`, { role });
export const toggleUserStatus = (id) => api.put(`/api/users/${id}/status`);
export const deleteUser = (id) => api.delete(`/api/users/${id}`);

export default api;
