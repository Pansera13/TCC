-- restore_stub_supabase.sql
-- Cria, num Postgres comum, os objetos que só existem no Supabase e que as policies
-- do dump referenciam (papéis anon/authenticated/service_role e a função auth.uid()).
-- Sem isto, o pg_restore acusa erros nas policies. É aplicado pelo restore.sh.
-- Seguro de rodar mais de uma vez.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon')          THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role')  THEN CREATE ROLE service_role NOLOGIN; END IF;
END
$$;

CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
