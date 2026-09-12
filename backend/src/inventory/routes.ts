import { Router } from 'express';
import { z } from 'zod';
import { badRequest } from '../errors.js';
import { requireAuth } from '../auth/middleware.js';
import {
  adjustToBalance,
  createProduct,
  getProduct,
  listMovements,
  listProducts,
  recordMovement,
  updateProduct,
} from './service.js';

export const inventoryRouter = Router();
inventoryRouter.use(requireAuth);

inventoryRouter.get('/products', (req, res) => {
  res.json({ products: listProducts(req.user!.id) });
});

const productBody = z.object({
  description: z.string(),
  gtin: z.string().nullish(),
  unit: z.string().optional(),
});

inventoryRouter.post('/products', (req, res) => {
  const parsed = productBody.safeParse(req.body);
  if (!parsed.success) throw badRequest('invalid_body', 'Dados do produto invalidos.');
  res.status(201).json({ product: createProduct(req.user!.id, parsed.data) });
});

inventoryRouter.get('/products/:id', (req, res) => {
  res.json({ product: getProduct(req.user!.id, Number(req.params.id)) });
});

inventoryRouter.patch('/products/:id', (req, res) => {
  const parsed = productBody.partial().safeParse(req.body);
  if (!parsed.success) throw badRequest('invalid_body', 'Dados do produto invalidos.');
  res.json({ product: updateProduct(req.user!.id, Number(req.params.id), parsed.data) });
});

inventoryRouter.get('/products/:id/movements', (req, res) => {
  res.json({ movements: listMovements(req.user!.id, Number(req.params.id)) });
});

const movementBody = z.object({
  type: z.enum(['in', 'out']),
  quantity: z.number().positive(),
});

inventoryRouter.post('/products/:id/movements', (req, res) => {
  const parsed = movementBody.safeParse(req.body);
  if (!parsed.success) throw badRequest('invalid_body', 'Movimentacao invalida.');
  const movement = recordMovement(
    req.user!.id,
    Number(req.params.id),
    parsed.data.type,
    parsed.data.quantity,
    'manual',
  );
  res.status(201).json({ movement });
});

const adjustBody = z.object({ balance: z.number().min(0) });

inventoryRouter.post('/products/:id/adjust', (req, res) => {
  const parsed = adjustBody.safeParse(req.body);
  if (!parsed.success) throw badRequest('invalid_body', 'Saldo invalido.');
  const movement = adjustToBalance(req.user!.id, Number(req.params.id), parsed.data.balance);
  res.status(201).json({ movement });
});
