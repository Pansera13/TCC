import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  function loginUser(token, nome, role, id) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify({ nome, role: role || 'admin', id }));
    setUser({ nome, role: role || 'admin', id });
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
