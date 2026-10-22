-- Central de notificações.
--   notificacoes        : conteúdo; NÃO é publicada no Realtime e não tem política para anon.
--   notificacoes_aviso  : uma linha por usuário com o horário da última mudança; é a única publicada.
-- O backend fala com o banco como postgres e ignora o RLS; a chave pública só enxerga notificacoes_aviso.
-- Reversão: reverter_notificacoes.sql
-- Rode DEPOIS de migracao_recuperacao_conta.sql (a notificação inicial usa usuarios.email_recuperacao).
BEGIN;

CREATE TABLE IF NOT EXISTS notificacoes (
  id          bigserial PRIMARY KEY,
  usuario_id  integer NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo        text NOT NULL,
  titulo      text NOT NULL,
  texto       text NOT NULL,
  acao        text,
  lida        boolean NOT NULL DEFAULT false,
  dispensada  boolean NOT NULL DEFAULT false,
  criado_em   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes (usuario_id, dispensada);
-- Impede duas notificações ativas do mesmo tipo para o mesmo usuário
CREATE UNIQUE INDEX IF NOT EXISTS uq_notificacoes_ativa_tipo
  ON notificacoes (usuario_id, tipo) WHERE dispensada = false;

ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;  -- sem política: anon não lê nada

CREATE TABLE IF NOT EXISTS notificacoes_aviso (
  usuario_id     integer PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notificacoes_aviso ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS aviso_leitura_anon ON notificacoes_aviso;
CREATE POLICY aviso_leitura_anon ON notificacoes_aviso FOR SELECT TO anon USING (true);

CREATE OR REPLACE FUNCTION notificacoes_atualiza_aviso() RETURNS trigger AS $$
BEGIN
  INSERT INTO notificacoes_aviso (usuario_id, atualizado_em)
  VALUES (NEW.usuario_id, now())
  ON CONFLICT (usuario_id) DO UPDATE SET atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notificacoes_aviso ON notificacoes;
CREATE TRIGGER trg_notificacoes_aviso
  AFTER INSERT OR UPDATE ON notificacoes
  FOR EACH ROW EXECUTE FUNCTION notificacoes_atualiza_aviso();

-- Publica só o aviso no Realtime (ignora se já estiver publicada)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notificacoes_aviso'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes_aviso;
  END IF;
END $$;

-- Primeira notificação: contas principais ativas (tenant_id = id) sem e-mail de recuperação.
-- Idempotente: não cria se o usuário já tem uma notificação desse tipo (ativa ou dispensada).
INSERT INTO notificacoes (usuario_id, tipo, titulo, texto, acao)
SELECT u.id,
       'cadastrar-email-recuperacao',
       'Cadastre um e-mail de recuperação',
       'Sem ele, você não consegue recuperar a senha se esquecê-la. Cadastre agora.',
       'abrir-email-recuperacao'
FROM usuarios u
WHERE u.tenant_id = u.id
  AND u.ativo = true
  AND u.email_recuperacao IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM notificacoes n
    WHERE n.usuario_id = u.id AND n.tipo = 'cadastrar-email-recuperacao'
  );

COMMIT;

-- Conferência 1: tabelas criadas (esperado: 2 linhas)
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('notificacoes', 'notificacoes_aviso') ORDER BY table_name;

-- Conferência 2: as duas contagens abaixo devem ser iguais
SELECT
  (SELECT count(*) FROM notificacoes WHERE tipo = 'cadastrar-email-recuperacao') AS notificacoes_criadas,
  (SELECT count(*) FROM usuarios WHERE tenant_id = id AND ativo = true AND email_recuperacao IS NULL) AS contas_principais_sem_email;

-- Conferência 3: só notificacoes_aviso deve estar publicada (esperado: 1 linha)
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND tablename IN ('notificacoes', 'notificacoes_aviso');
