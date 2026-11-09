#!/usr/bin/env bash
# restore.sh — Restaura um backup do StockFlow em um banco DESCARTÁVEL
#
# Uso:
#   ./restore.sh <arquivo.dump> <DATABASE_URL_DESTINO>
#
# AVISO: NUNCA aponte o banco destino para o Supabase de produção.
#        Use um banco de teste local (Docker, Railway, Supabase novo projeto).
#
# Exemplo com Docker local:
#   docker run -d -e POSTGRES_PASSWORD=teste -p 5433:5432 --name pg-teste postgres:16
#   ./restore.sh stockflow_backup_20260101_120000.dump postgresql://postgres:teste@localhost:5433/postgres
#
# Requer: pg_restore (PostgreSQL client tools)

set -euo pipefail

ARQUIVO="${1:-}"
DESTINO="${2:-}"

if [[ -z "${ARQUIVO}" || -z "${DESTINO}" ]]; then
  echo "Uso: $0 <arquivo.dump> <DATABASE_URL_DESTINO>" >&2
  exit 1
fi

if [[ ! -f "${ARQUIVO}" ]]; then
  echo "ERRO: arquivo '${ARQUIVO}' não encontrado." >&2
  exit 1
fi

# Bloquear acidentalmente o Supabase de produção
# (cobre db.PROJETO.supabase.co e o pooler aws-*.pooler.supabase.com)
if echo "${DESTINO}" | grep -qiE 'supabase\.(co|com)'; then
  echo "ERRO: o banco destino parece ser o Supabase de produção (supabase.co / supabase.com)." >&2
  echo "Use um banco de teste local ou um projeto Supabase descartável." >&2
  exit 1
fi

echo "Restaurando '${ARQUIVO}' → ${DESTINO}"
echo "AVISO: dados existentes no banco destino serão sobrescritos/mesclados."
read -rp "Confirmar? (s/N): " CONF
[[ "${CONF,,}" == "s" ]] || { echo "Cancelado."; exit 0; }

# Papéis e auth.uid() do Supabase, referenciados pelas policies do dump
psql "${DESTINO}" -v ON_ERROR_STOP=1 -q -f "$(dirname "$0")/restore_stub_supabase.sql"

pg_restore \
  --no-owner \
  --no-acl \
  --if-exists \
  --clean \
  -d "${DESTINO}" \
  "${ARQUIVO}"

echo ""
echo "Restauração concluída. Verifique os dados no banco destino."
echo "Para checar tabelas principais:"
echo "  psql \"${DESTINO}\" -c 'SELECT COUNT(*) FROM usuarios;'"
echo "  psql \"${DESTINO}\" -c 'SELECT COUNT(*) FROM products;'"
