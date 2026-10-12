import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  function loginUser(token, nome, role, id) {
    const avatarUrl = localStorage.getItem('avatar_' + id) || undefined;
    const userData = { nome, role: role || 'admin', id, ...(avatarUrl ? { avatarUrl } : {}) };
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
    if (fields.avatarUrl !== undefined && user?.id) {
      localStorage.setItem('avatar_' + user.id, fields.avatarUrl);
    }
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
