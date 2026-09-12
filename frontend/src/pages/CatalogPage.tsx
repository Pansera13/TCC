import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, type Product } from '../api';

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const flash = (location.state as { flash?: string } | null)?.flash;

  useEffect(() => {
    api
      .listProducts()
      .then((r) => setProducts(r.products))
      .catch(() => setError('Não foi possível carregar o catálogo.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <div className="page-head">
        <h1>Catálogo</h1>
        <button className="btn btn-primary" onClick={() => navigate('/escanear')}>
          + Importar nota
        </button>
      </div>

      {flash && <p className="flash">{flash}</p>}
      {loading && <p className="muted">Carregando...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && products.length === 0 && (
        <div className="card empty">
          <p>Seu estoque está vazio.</p>
          <p className="muted">Escaneie o QR Code de uma NFC-e para importar produtos automaticamente.</p>
          <Link to="/escanear" className="btn btn-primary">
            Escanear nota
          </Link>
        </div>
      )}

      {products.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Produto</th>
              <th className="num">Saldo</th>
              <th>Un.</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="row-link" onClick={() => navigate(`/produtos/${p.id}`)}>
                <td>
                  {p.description}
                  {p.gtin && <span className="muted gtin"> · {p.gtin}</span>}
                </td>
                <td className="num">{p.balance}</td>
                <td>{p.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
