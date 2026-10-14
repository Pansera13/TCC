require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const nfeRoutes = require('./routes/nfe');
const movementRoutes = require('./routes/movements');
const userRoutes = require('./routes/users');
const profileRoutes = require('./routes/profile');

const app = express();
const PORT = process.env.PORT || 3001;

const ALLOWED_ORIGINS = /^https?:\/\/(localhost|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;
app.use(cors({ origin: (origin, cb) => cb(null, !origin || ALLOWED_ORIGINS.test(origin)) }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/nfe', nfeRoutes);
app.use('/api/movements', movementRoutes);
app.use('/api/users', userRoutes);
app.use('/api/profile', profileRoutes);

// JSON error handler — retorna mensagem legível em vez de HTML
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err);
  const status = err.status ?? err.statusCode ?? 500;
  res.status(status).json({ message: err.message || 'Erro interno no servidor.' });
});

app.listen(PORT, () => {
  console.log(`Backend StockFlow rodando em http://localhost:${PORT}`);
});
