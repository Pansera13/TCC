import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MeusPedidos from './pages/MeusPedidos';
import NovoPedido from './pages/NovoPedido';
import DetalhesPedido from './pages/DetalhesPedido';
import HistoricoPedidos from './pages/HistoricoPedidos';
import ThemeToggle from './components/ThemeToggle';

export default function App() {
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('theme') === 'dark'
  );

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  return (
    <BrowserRouter>
      <ThemeToggle isDark={darkMode} onToggle={() => setDarkMode(d => !d)} />
      <Routes>
        <Route path="/pedidos" element={<MeusPedidos />} />
        <Route path="/pedidos/historico" element={<HistoricoPedidos />} />
        <Route path="/pedidos/novo" element={<NovoPedido />} />
        <Route path="/pedidos/:id" element={<DetalhesPedido />} />
        <Route path="*" element={<Navigate to="/pedidos" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
