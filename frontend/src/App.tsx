import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { RequireAuth, useAuth } from './auth';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CatalogPage from './pages/CatalogPage';
import ProductPage from './pages/ProductPage';
import ScanPage from './pages/ScanPage';
import ReviewPage from './pages/ReviewPage';

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <header className="app-header">
      <Link to="/" className="brand">
        📦 Estoque NFC-e
      </Link>
      <nav>
        <Link to="/">Catálogo</Link>
        <Link to="/escanear" className="btn btn-primary btn-sm">
          Escanear
        </Link>
        <button
          className="btn btn-ghost btn-sm"
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
        >
          Sair
        </button>
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <div className="app">
      <Header />
      <main className="app-main">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <CatalogPage />
              </RequireAuth>
            }
          />
          <Route
            path="/produtos/:id"
            element={
              <RequireAuth>
                <ProductPage />
              </RequireAuth>
            }
          />
          <Route
            path="/escanear"
            element={
              <RequireAuth>
                <ScanPage />
              </RequireAuth>
            }
          />
          <Route
            path="/revisar"
            element={
              <RequireAuth>
                <ReviewPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
