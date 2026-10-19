-- Reverte migracao_cargo_socio.sql.
-- Contas com cargo 'socio' passam para 'user' (operador) antes de restaurar a regra antiga.
BEGIN;
UPDATE usuarios SET role = 'user' WHERE role = 'socio';
ALTER TABLE usuarios DROP CONSTRAINT usuarios_role_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_role_check
  CHECK (role = ANY (ARRAY['admin'::text, 'user'::text]));
COMMIT;
