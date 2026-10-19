import { Component, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import SocialLinks from './components/SocialLinks';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '16px', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ fontSize: '48px' }}>⚠️</div>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#374151' }}>Algo deu errado</h1>
          <p style={{ fontSize: '14px', color: '#6B7280', textAlign: 'center', maxWidth: '320px' }}>
            Ocorreu um erro inesperado. Por favor, recarregue a página.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '8px 24px', backgroundColor: '#7C3AED', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/" replace />;
}


export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/register" element={<Register darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard darkMode={darkMode} setDarkMode={setDarkMode} /></ProtectedRoute>} />
          </Routes>
          <SocialLinks />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
