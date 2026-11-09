-- ============================================================
-- Bloco 4 — Tabela de eventos de segurança
-- Aplicar no SQL Editor do Supabase
-- ============================================================

CREATE TABLE eventos_seguranca (
    id          BIGSERIAL PRIMARY KEY,
    tenant_id   BIGINT,
    usuario_id  BIGINT,
    tipo        TEXT NOT NULL,
    ip          TEXT,
    user_agent  TEXT,
    detalhes    JSONB,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_eventos_seg_tipo_criado   ON eventos_seguranca (tipo, criado_em DESC);
CREATE INDEX idx_eventos_seg_tenant_criado ON eventos_seguranca (tenant_id, criado_em DESC);
CREATE INDEX idx_eventos_seg_usuario       ON eventos_seguranca (usuario_id, criado_em DESC);

-- ── REVERSÃO ────────────────────────────────────────────────
-- DROP TABLE IF EXISTS eventos_seguranca;
