import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getProfile } from '../services/api';

const AuthContext = createContext(null);

// A sessão fica no sessionStorage: cada aba tem o seu próprio login, então dá para usar
// contas diferentes no mesmo navegador (fechar a aba encerra a sessão dela).
// Remove restos da sessão antiga, que ficava compartilhada entre abas no localStorage.
try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch { /* sem acesso ao localStorage */ }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = sessionStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const profileFetchedRef = useRef(false);

  function applyProfileData(data) {
    setUser(prev => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        avatarUrl: data.avatar_url ?? prev.avatarUrl,
        role: data.role || prev.role,
        permissoes: data.permissoes ?? prev.permissoes,
        email_recuperacao: data.email_recuperacao ?? prev.email_recuperacao,
      };
      sessionStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }

  // Busca o perfil uma vez após a montagem quando há token (cobre sessão restaurada do sessionStorage)
  // O ref protege contra o efeito duplo do StrictMode em dev
  useEffect(() => {
    if (!sessionStorage.getItem('token') || profileFetchedRef.current) return;
    profileFetchedRef.current = true;
    getProfile().then(({ data }) => applyProfileData(data)).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function loginUser(token, nome, role, id, avatar_url, permissoes) {
    const userData = { nome, role: role || 'admin', id, avatarUrl: avatar_url || null, permissoes: permissoes || [] };
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    // Busca perfil fresco após login (profileFetchedRef pode já estar true da sessão anterior)
    profileFetchedRef.current = true;
    getProfile().then(({ data }) => applyProfileData(data)).catch(() => {});
  }

  function logoutUser() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    profileFetchedRef.current = false;
    setUser(null);
  }

  function updateUser(fields) {
    setUser(prev => {
      const updated = { ...prev, ...fields };
      sessionStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }

  function revalidateProfile() {
    if (!sessionStorage.getItem('token')) return;
    getProfile().then(({ data }) => applyProfileData(data)).catch(() => {});
  }

  function can(permissao) {
    return (user?.permissoes || []).includes(permissao);
  }

  return (
    <AuthContext.Provider value={{ user, loginUser, logoutUser, updateUser, revalidateProfile, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
