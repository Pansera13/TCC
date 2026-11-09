# Estratégia de Backup — StockFlow

## Visão Geral

| Métrica | Valor | Significado |
|---------|-------|-------------|
| **RPO** (Recovery Point Objective) | 24 horas | Máximo de dados que podem ser perdidos em um incidente |
| **RTO** (Recovery Time Objective) | 2 horas | Tempo máximo para restaurar o serviço após um incidente |

---

## Ferramenta

`pg_dump --format=custom --compress=9` (formato binário, comprimido com gzip nível 9).

**Por que custom (`-Fc`) e não SQL?**
- Permite restauração seletiva de tabelas com `pg_restore -t tabela`
- Compressão integrada reduz tamanho em ~70-90%
- Paralelismo na restauração com `-j N`

---

## Procedimento de Backup

```bash
# 1. Garantir que DATABASE_URL está definida:
export DATABASE_URL="postgresql://postgres:SENHA@db.PROJETO.supabase.co:5432/postgres"

# 2. Executar o script:
./backup.sh

# Saída: stockflow_backup_YYYYMMDD_HHMMSS.dump
```

**Frequência recomendada:** 1× por dia (cron às 03:00).

**Exemplo de cron (Linux/macOS):**
```
0 3 * * * cd /caminho/projeto && DATABASE_URL="postgresql://..." ./sql/backup.sh >> /var/log/stockflow_backup.log 2>&1
```

---

## Procedimento de Restauração (Teste)

**Nunca restaurar no Supabase de produção.** Use um banco local descartável.

**Opção 1 — Docker local:**
```bash
docker run -d \
  -e POSTGRES_PASSWORD=teste \
  -p 5433:5432 \
  --name pg-teste \
  postgres:16

./restore.sh \
  stockflow_backup_20260101_120000.dump \
  postgresql://postgres:teste@localhost:5433/postgres
```

**Opção 2 — Supabase novo projeto (descartável):**
Crie um projeto separado apenas para teste, copie a DATABASE_URL dele e use no restore.sh.

**Opção 3 — PostgreSQL portátil, sem Docker (usada no teste de 08/11/2026):**
Baixe o zip de binários do PostgreSQL 17 (mesma versão major do Supabase), extraia fora do Git e crie um servidor temporário:
```bash
initdb -D data -U postgres --auth=trust -E UTF8 --locale=C
pg_ctl -D data -o "-p 5433 -c listen_addresses=127.0.0.1" -l pg.log -w start
psql -h 127.0.0.1 -p 5433 -U postgres -c "create database stockflow_restore"
./restore.sh stockflow_backup_AAAAMMDD_HHMMSS.dump postgresql://postgres@127.0.0.1:5433/stockflow_restore
```

O `restore.sh` aplica antes o `restore_stub_supabase.sql`, que cria os papéis `anon`/`authenticated`/`service_role` e a função `auth.uid()`. Sem isso, o `pg_restore` acusa 8 erros, porque as policies de RLS do dump dependem de objetos que só existem no Supabase.

O dump traz dados pessoais (e-mails e hashes de senha): guarde-o fora do Git e apague-o após o teste.

---

## Verificação Pós-Restauração

```sql
-- Checar integridade básica:
SELECT COUNT(*) FROM usuarios;      -- deve bater com produção
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM movements;
SELECT MAX(created_at) FROM movements;  -- última movimentação presente?
```

### Resultado do teste de restauração — 08/11/2026

Backup do Supabase de produção (schema `public`, via pooler) restaurado num PostgreSQL 17.11 local descartável.

| Medida | Resultado |
|--------|-----------|
| Tamanho do dump | 48 KB |
| Tempo do backup (`pg_dump`) | 2,5 s |
| Tempo da restauração (`pg_restore`) | 0,6 s, sem erros |
| Tabelas conferidas | 10 de 10 com a mesma contagem de linhas e o mesmo estado de RLS |
| Policies de RLS | 8 no original, 8 no restaurado |
| Última movimentação (`movements`) | idêntica nos dois |

Contagens (produção = restaurado): `products` 488, `movements` 59, `pedidos` 14, `itens_pedido` 13, `usuarios` 3, `django_content_type` 5, `notificacoes` 2, `notificacoes_aviso` 2, `django_migrations` 2, `eventos_seguranca` 0.

**Ajustes feitos por causa do teste:**
- `backup.sh` passou a usar `--schema=public`: o app só usa esse schema, e o dump completo traria também os schemas internos do Supabase.
- `restore.sh` passou a aplicar `restore_stub_supabase.sql` (ver acima).
- A trava anti-produção do `restore.sh` só bloqueava `supabase.co`; o pooler (`*.pooler.supabase.com`) passava. Agora bloqueia `supabase.co` e `supabase.com`.

**Leitura do resultado:** com o volume atual de dados, o tempo de backup mais restauração é de segundos, muito abaixo do RTO de 2 h. O RTO real seria dominado por criar um banco novo e reapontar a aplicação, não pela cópia dos dados. Os tempos medidos não se extrapolam para volumes muito maiores.

---

## Retenção Sugerida

| Período | Política |
|---------|----------|
| Últimos 7 dias | Manter todos os dumps diários |
| 7–30 dias | Manter apenas o dump do domingo |
| > 30 dias | Excluir (dados de desenvolvimento/TCC) |

---

## Supabase Point-in-Time Recovery (PITR)

O Supabase Pro oferece **PITR** nativo (restore para qualquer segundo dos últimos 7 dias).
Para o plano gratuito (Free), não há PITR — o `pg_dump` manual é a única proteção.

---

## Limitações Deste TCC

- Backup é manual (sem automação de cron configurada)
- O teste de restauração foi feito uma vez (08/11/2026), em PostgreSQL local descartável; não há
  teste periódico automatizado (o restore.sh recusa destinos do Supabase para evitar acidentes)
- RPO/RTO documentados são objetivos; em produção real requerem infraestrutura dedicada
