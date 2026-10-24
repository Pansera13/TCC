import { createContext, useContext, useState } from 'react';

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

  function loginUser(token, nome, role, id, avatar_url, permissoes) {
    const userData = { nome, role: role || 'admin', id, avatarUrl: avatar_url || null, permissoes: permissoes || [] };
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }

  function logoutUser() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
  }

  function updateUser(fields) {
    const updated = { ...user, ...fields };
    sessionStorage.setItem('user', JSON.stringify(updated));
    setUser(updated);
  }

  function can(permissao) {
    return (user?.permissoes || []).includes(permissao);
  }

  return (
    <AuthContext.Provider value={{ user, loginUser, logoutUser, updateUser, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
