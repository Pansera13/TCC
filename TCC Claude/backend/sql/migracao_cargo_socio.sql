-- Cargo "socio": amplia a regra de usuarios.role para aceitar 'admin', 'socio' e 'user'.
-- Só alarga o CHECK; nenhum dado é alterado. Reversão: reverter_cargo_socio.sql
BEGIN;
ALTER TABLE usuarios DROP CONSTRAINT usuarios_role_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_role_check
  CHECK (role IN ('admin', 'socio', 'user'));
COMMIT;
