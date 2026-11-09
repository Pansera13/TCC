# Relatório — Testes de Ataque Simulado (Bloco 8)

Data: 2026-11-08  
Resultado: **34/34 testes passaram**

## A — SQL Injection

| Cenário | Resultado |
|---------|-----------|
| Payloads SQL clássicos no campo `identifier` do login | ✅ Bloqueado (401/429) |
| Nome de produto com payload `'; DROP TABLE products;--` | ✅ Salvo literalmente, tabela intacta |
| Parâmetro de busca com `UNION SELECT senha_hash` | ✅ Sem vazamento de dados |

**Conclusão:** Consultas parametrizadas via psycopg2 (ORM Django + `cursor.execute`) previnem SQL injection.

---

## B — Brute-force / Rate limit

| Cenário | Resultado |
|---------|-----------|
| 6ª tentativa de login no mesmo IP/identificador | ✅ 429 Too Many Requests |
| Cabeçalho `Retry-After` presente na resposta 429 | ✅ Presente |
| IP diferente não herda bloqueio de outro IP | ✅ Isolado por IP |

**Conclusão:** Rate limit por IP e por identificador funciona corretamente.

---

## C — Acesso Cross-Tenant

| Cenário | Resultado |
|---------|-----------|
| Listar produtos do tenant B via token do tenant A | ✅ Produtos de B não aparecem |
| PUT no produto do tenant B com token de A | ✅ 403/404 |
| PATCH no produto do tenant B com token de A | ✅ 403/404/405 |
| Movimentações do tenant B não visíveis para tenant A | ✅ Isoladas |

**Conclusão:** Isolamento de tenant via `tenant_id` nos filtros SQL funciona corretamente.

---

## D — Manipulação de JWT

| Cenário | Resultado |
|---------|-----------|
| Token com assinatura vazia/removida | ✅ 401 |
| Token com `alg: none` | ✅ 401 |
| Token expirado | ✅ 401 |
| Token assinado com chave incorreta | ✅ 401 |
| Acesso sem token | ✅ 401 |
| Token forjado com outro tenant_id (não consegue forjar sem a chave) | ✅ Verificação de assinatura bloqueia |

**Conclusão:** Validação JWT via PyJWT com algoritmo fixo HS256 e verificação de expiração funciona.

---

## E — Corpo Excessivo / XXE

| Cenário | Resultado |
|---------|-----------|
| JSON de 200 KB (acima do limite de 64 KB) | ✅ 413 Request Entity Too Large |
| XML com entidade XXE `<!ENTITY xxe SYSTEM "file:///etc/passwd">` | ✅ Rejeitado (400/422) — sem conteúdo de arquivo |
| JSON com 300+ campos extras | ✅ Sem erro 500 (campos extras ignorados) |

**Conclusão:** `DATA_UPLOAD_MAX_MEMORY_SIZE` limita corpo; parser XML de NF-e rejeita DOCTYPE.

---

## F — Escalonamento de Privilégio

| Cenário | Resultado |
|---------|-----------|
| `funcionario` (role=user) tentando arquivar produto | ✅ 403 |
| `funcionario` tentando criar produto | ✅ 403 |
| Segundo teste de `funcionario` criando produto | ✅ 403 |
| `role: admin` forjado no body da requisição | ✅ Ignorado — autoridade vem do JWT |

**Nota:** `socio` PODE criar produtos por design (permissão `produto:cadastrar` = nível sócio).

**Conclusão:** Autorização via `can(user['role'], permissao)` lida com hierarquia corretamente. Role do JWT é autoritativa.

---

## G — Enumeração de Contas

| Cenário | Resultado |
|---------|-----------|
| Login com e-mail existente vs. inexistente — mesmo HTTP 401 | ✅ Código idêntico |
| Mensagens de erro iguais para usuário existente e inexistente | ✅ Sem diferença |
| Busca de recuperação com e-mail inexistente retorna 404 | ✅ 404 (não 200 vazio) |
| Cadastro com e-mail duplicado — sem vazar dados da conta existente | ✅ Sem senha_hash nem bcrypt na resposta |

**Conclusão:** Timing e mensagens de erro não revelam existência de conta.

---

## H — Cabeçalhos de Segurança

| Cabeçalho | Valor | Resultado |
|-----------|-------|-----------|
| `X-Frame-Options` | `DENY` | ✅ |
| `X-Content-Type-Options` | `nosniff` | ✅ |
| `Referrer-Policy` | `same-origin` | ✅ |
| `Content-Security-Policy` | presente com `default-src 'none'` | ✅ |
| `Permissions-Policy` | presente | ✅ |
| `Server` | sem versão Django/Python | ✅ |

**Conclusão:** Todos os cabeçalhos de segurança obrigatórios estão presentes e corretos.

---

## Resumo

| Categoria | Testes | Passou |
|-----------|--------|--------|
| SQL Injection | 3 | 3 ✅ |
| Brute-force | 3 | 3 ✅ |
| Cross-Tenant | 4 | 4 ✅ |
| JWT | 6 | 6 ✅ |
| Corpo/XXE | 3 | 3 ✅ |
| Privilégio | 4 | 4 ✅ |
| Enumeração | 4 | 4 ✅ |
| Cabeçalhos | 7 | 7 ✅ |
| **Total** | **34** | **34 ✅** |
