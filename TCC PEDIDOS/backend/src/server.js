require('dotenv').config();
const express = require('express');
const cors = require('cors');

const pedidosRouter = require('./routes/pedidos');
const estoqueRouter = require('./routes/estoque');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/pedidos', pedidosRouter);
app.use('/estoque', estoqueRouter);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`TCC PEDIDOS backend rodando na porta ${PORT}`);
});
