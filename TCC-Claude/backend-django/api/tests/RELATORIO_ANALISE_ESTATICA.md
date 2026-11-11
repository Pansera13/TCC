# Relatório — Análise Estática de Segurança (Bloco 2)

Data: 2026-11-11  
Resultado: **7 achados originais — 1 corrigido, 6 suprimidos com `# nosec` documentado — 0 achados sem triagem**

## Ferramenta e Comando

| Item | Valor |
|------|-------|
| Ferramenta | bandit 1.9.4 |
| Python | 3.14.7 |
| Comando | `python -m bandit -r api -x api/tests` |
| Diretório | `backend-django/` |
| Saída final | `No issues identified.` (exit code 0) |

---

## Achados e Decisão

| Arquivo | Linha (original) | Regra | Severidade | Confiança | Decisão | Justificativa |
|---------|-----------------|-------|-----------|----------|---------|---------------|
| `api/views/movements.py` | 86 | B608 | Medium | Medium | Suprimido (`# nosec B608`) | `filtro` é `'WHERE ' + ' AND '.join(where)` onde cada cláusula usa `add(val)` → `%s`; nenhum valor do usuário interpolado na string SQL |
| `api/views/movements.py` | 91 | B608 | Medium | Medium | Suprimido (`# nosec B608`) | f-string multilinha reestruturada para concat implícita; `coluna` ∈ `COLUNAS_ORDEM` (whitelist), `direcao` ∈ `{'ASC','DESC'}` (ternário), `filtro` só contém `%s` |
| `api/views/reports.py` | 55 | B608 | Medium | Medium | **Corrigido** (removido prefixo `f`) | f-string sem nenhuma interpolação — `%s` eram literais no template; prefixo `f` era desnecessário |
| `api/views/reports.py` | 64 | B608 | Medium | Medium | Suprimido (`# nosec B608`) | `periodo` é constante de módulo calculada a partir de `FUSO` (string literal); `nao_arquivado` é string literal; nenhum dado de usuário interpolado |
| `api/views/reports.py` | 73 | B608 | Medium | Medium | Suprimido (`# nosec B608`) | Mesmo caso: `periodo` e `nao_arquivado` são constantes sem dados do usuário |
| `api/views/reports.py` | 82 | B608 | Medium | Medium | Suprimido (`# nosec B608`) | Mesmo caso: apenas `periodo` interpolado (subquery de JOIN); constante sem dados do usuário |
| `api/views/reports.py` | 96 | B608 | Medium | Medium | Suprimido (`# nosec B608`) | Mesmo caso: `periodo` constante sem dados do usuário |

---

## Notas Técnicas

**Por que B608 é falso positivo nesses casos?**  
O bandit B608 detecta `cursor.execute()` cujo primeiro argumento contém qualquer construção dinâmica de string (f-string, `%`, `.format()`, `+`). Não verifica se o dado do usuário é passado via `params` (segundo argumento). Todos os 7 achados usam `cursor.execute(sql, params)` com parametrização correta — os valores do usuário entram exclusivamente via `params`.

**Cobertura confirmada por testes de SQL injection:**  
Ver `RELATORIO_ATAQUES_SIMULADOS.md` Seção A — payloads SQL clássicos testados contra as mesmas queries; todos bloqueados.

**Achados em `api/tests/`:**  
Excluídos do escopo do bandit (`-x api/tests`) pois testes de segurança intencionalmente constroem strings suspeitas para simular ataques.
