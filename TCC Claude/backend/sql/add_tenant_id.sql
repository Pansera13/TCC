-- Migration: adiciona tenant_id para isolamento de dados entre empresas
-- Execute no SQL Editor do Supabase. Idempotente (usa IF NOT EXISTS e IS NULL).

BEGIN;

-- 1. Adicionar tenant_id nas três tabelas
ALTER TABLE usuarios  ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE products  ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE movements ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

-- 2. Admins viram donos do seu próprio tenant
UPDATE usuarios SET tenant_id = id WHERE tenant_id IS NULL AND role = 'admin';

-- 3. Usuários não-admin herdam o tenant do admin de menor id (criador mais provável)
UPDATE usuarios SET tenant_id = (
  SELECT MIN(id) FROM usuarios WHERE role = 'admin'
) WHERE tenant_id IS NULL;

-- 4. Produtos e movimentações existentes pertencem ao admin de menor id
UPDATE products  SET tenant_id = (SELECT MIN(id) FROM usuarios WHERE role = 'admin') WHERE tenant_id IS NULL;
UPDATE movements SET tenant_id = (SELECT MIN(id) FROM usuarios WHERE role = 'admin') WHERE tenant_id IS NULL;

COMMIT;
