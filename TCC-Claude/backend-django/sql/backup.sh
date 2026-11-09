#!/usr/bin/env bash
# backup.sh — Faz backup completo do banco StockFlow via pg_dump
#
# Uso:
#   chmod +x backup.sh
#   DATABASE_URL="postgresql://postgres:SENHA@db.PROJETO.supabase.co:5432/postgres" ./backup.sh
#
# O arquivo gerado é um dump binário (.dump) comprimido com -Fc.
# Para listar o conteúdo sem restaurar: pg_restore -l arquivo.dump
#
# Requer: pg_dump (PostgreSQL client tools)
#   Ubuntu/Debian: sudo apt install postgresql-client
#   macOS (Homebrew): brew install libpq && export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
#   Windows: instalar PostgreSQL client ou usar WSL

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERRO: variável DATABASE_URL não definida." >&2
  echo "Exemplo: export DATABASE_URL=postgresql://postgres:SENHA@host:5432/postgres" >&2
  exit 1
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARQUIVO="stockflow_backup_${TIMESTAMP}.dump"

echo "Iniciando backup → ${ARQUIVO}"

# --schema=public: o app só usa o schema public. Sem isso o dump traz também os
# schemas internos do Supabase (auth, storage, realtime...), que não são nossos e
# podem falhar ao restaurar fora do Supabase.
pg_dump \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-acl \
  --schema=public \
  "${DATABASE_URL}" \
  --file="${ARQUIVO}"

SIZE=$(du -sh "${ARQUIVO}" | cut -f1)
echo "Backup concluído: ${ARQUIVO} (${SIZE})"
echo ""
echo "Para listar tabelas:   pg_restore -l ${ARQUIVO}"
echo "Para restaurar:        ./restore.sh ${ARQUIVO} postgresql://USUARIO:SENHA@HOST:5432/BANCO_TESTE"
