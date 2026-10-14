import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  function loginUser(token, nome, role, id, avatar_url) {
    const userData = { nome, role: role || 'admin', id, avatarUrl: avatar_url || null };
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }

  function logoutUser() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  function updateUser(fields) {
    const updated = { ...user, ...fields };
    localStorage.setItem('user', JSON.stringify(updated));
    setUser(updated);
  }

  return (
    <AuthContext.Provider value={{ user, loginUser, logoutUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
