# Design

## Context

Estado atual relevante:

```python
# api/views/nfe.py — bugs identificados
@exige_permissao('produto:importar-nfe')
def parse_nfe(request):
    max_size = getattr(settings, 'NFE_MAX_SIZE_BYTES', 2 * 1024 * 1024)
    if request.FILES.get('arquivo'):
        f = request.FILES['arquivo']
        if f.size > max_size:
            return JsonResponse({'message': f'...'}, status=400)   # ← bug: deve ser 413
        xml_bytes = f.read()                                        # ← sem validação de extensão/tipo
    else:
        if len(request.body) > max_size:                           # ← bug: lê corpo inteiro antes
            return JsonResponse({'message': f'...'}, status=400)   # ← bug: deve ser 413
        xml_bytes = request.body
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:                                          # ← não captura exceções defusedxml
        return JsonResponse({'message': '...'}, status=400)
    # sem limite de itens, sem rate limit, sem auditoria
```

```python
# api/limites.py — funções disponíveis (sem modificar)
ip_do_cliente(request)                            # → str
segundos_bloqueado(chave)                         # → int (0 se não bloqueado)
registrar_falha(chave, janela_s, max_falhas, bloqueio_s, contexto='')
limpar_contador(chave)
```

```jsx
// AddProductModal.jsx — handleXmlFile (trecho relevante)
} catch (err) {
    setXmlError(err.response?.data?.message || 'Não foi possível ler o XML da NF-e.');
}
// já exibe err.response?.data?.message; falta countdown para 429
```

## Goals / Non-Goals

**Goals:**
- Validar o upload em camadas (tamanho → extensão → Content-Type → sniff → parse → estrutura → rate limit).
- Corrigir status 400 → 413 nas respostas de tamanho e padronizar o formato.
- Proteger contra XXE, billion laughs e double extensions sem novas dependências.
- Registrar rejeições no log sem expor conteúdo ou dados pessoais além de user_id.

**Non-Goals:**
- Alterar tabelas ou schemas do banco.
- Mudar o formato de sucesso `{produtos, chNFe}`.
- Introduzir novas dependências externas além de `defusedxml` (já presente).

## Decisions

### D1 — Ordem das camadas de validação em `parse_nfe`

```
1. Rate limit check   — antes de qualquer I/O (usa apenas cache)
2. Size check         — UploadedFile.size para multipart, Content-Length para raw
3. Extension check    — os.path.basename + dupla extensão
4. Content-Type check — f.content_type (multipart) ou request.content_type (raw)
5. Read content       — f.read() ou request.body (depois das cheagens acima)
6. Content sniff      — strip BOM + lstrip; primeiro byte deve ser b'<'
7. defusedxml parse   — catch ET.ParseError + defusedxml.DefusedXmlException
8. Structural limits  — count <det> vs. NFE_MAX_ITENS
9. Existing logic     — infNFe, chave, dedup, produtos (sem mudança)
```

A checagem de tamanho no step 2 usa `UploadedFile.size` para multipart (não lê o conteúdo) e o Content-Length do cabeçalho para raw body (mesmo comportamento de `RequestSizeLimitMiddleware` da change `limitar-tamanho-do-corpo`). O conteúdo é lido apenas no step 5, após as verificações de metadados.

### D2 — Verificação de extensão e nome (`_validar_nome`)

```python
import os

def _validar_nome(nome):
    nome = os.path.basename(nome)                    # remove qualquer path
    if not nome or '\x00' in nome:                   # byte nulo
        return False
    stem, ext = os.path.splitext(nome)
    if ext.lower() != '.xml':                        # extensão final ≠ .xml
        return False
    _, inner = os.path.splitext(stem)
    if inner:                                        # double extension: nota.exe.xml
        return False
    return True
```

Não testa barras explicitamente porque `os.path.basename` já as trata. Rejeita `..` como resultado do basename sendo vazio ou "..".

### D3 — Verificação de Content-Type

```python
_TIPOS_ACEITOS = {'application/xml', 'text/xml', 'application/octet-stream'}

def _ct_ok(ct_raw):
    ct = (ct_raw or '').split(';')[0].strip().lower()
    return ct in _TIPOS_ACEITOS
```

Para upload multipart: verificar `f.content_type` (Content-Type da parte do arquivo).
Para raw body: verificar `request.content_type`.
Se ausente: aceitar (tratar como `application/octet-stream` implícito) — o sniff de conteúdo faz a verificação real.

### D4 — Content sniff

```python
_BOMS = (b'\xef\xbb\xbf', b'\xff\xfe', b'\xfe\xff')

def _parece_xml(data: bytes) -> bool:
    for bom in _BOMS:
        if data.startswith(bom):
            data = data[len(bom):]
            break
    return data.lstrip()[:1] == b'<'
```

Chamado após `f.read()` / `request.body`. Rejeita binários e HTML que não começam com `<`.

### D5 — Parse seguro com defusedxml

```python
import defusedxml
import defusedxml.ElementTree as ET

try:
    root = ET.fromstring(xml_bytes)
except (ET.ParseError, defusedxml.DefusedXmlException) as exc:
    _log_rejeicao(request, 400, 'xml_invalido')
    return JsonResponse({'message': 'O arquivo não é um XML válido.'}, status=400)
```

`defusedxml.DefusedXmlException` é a classe base para `DTDForbidden`, `EntitiesForbidden`, `ExternalReferenceForbidden` e `NotSupportedError`. Capturá-la cobre todos os ataques bloqueados pelo defusedxml sem precisar importar cada subclasse individualmente. A mensagem de erro não expõe detalhes internos da exceção.

O `nfe.py` já importa `import defusedxml.ElementTree as ET`. Adicionar `import defusedxml` para acessar `defusedxml.DefusedXmlException`.

### D6 — Limite estrutural (`NFE_MAX_ITENS`)

Após o parse, antes do loop de produtos:

```python
max_itens = getattr(settings, 'NFE_MAX_ITENS', 500)
dets = _findall(inf_nfe, 'det')
if len(dets) > max_itens:
    _log_rejeicao(request, 422, 'itens_excedidos')
    return JsonResponse(
        {'message': f'NF-e contém muitos itens. Máximo permitido: {max_itens}.'},
        status=422,
    )
```

O `_findall` já existe no módulo. Reutilizado sem modificação.

### D7 — Rate limit com `api/limites.py`

Chaves: `f'nfe:user:{user_id}'` e `f'nfe:ip:{ip}'`. Checar ambas; bloquear se qualquer uma estiver bloqueada.

```python
from api.limites import ip_do_cliente, segundos_bloqueado, registrar_falha

def _check_rate_limit(request):
    user_id = request.user_data['user_id']
    ip = ip_do_cliente(request)
    chave_user = f'nfe:user:{user_id}'
    chave_ip = f'nfe:ip:{ip}'

    bloq_user = segundos_bloqueado(chave_user)
    bloq_ip = segundos_bloqueado(chave_ip)
    retry = max(bloq_user, bloq_ip)
    if retry > 0:
        return retry

    max_req = getattr(settings, 'NFE_MAX_IMPORTACOES', 20)
    janela = getattr(settings, 'NFE_JANELA_SEGUNDOS', 600)
    bloqueio = getattr(settings, 'NFE_BLOQUEIO_SEGUNDOS', 600)
    registrar_falha(chave_user, janela, max_req, bloqueio, 'nfe')
    registrar_falha(chave_ip, janela, max_req, bloqueio, 'nfe')
    return 0

# No início de parse_nfe, após @exige_permissao:
retry = _check_rate_limit(request)
if retry > 0:
    _log_rejeicao(request, 429, 'rate_limit')
    resp = JsonResponse(
        {'message': 'Muitas tentativas. Tente novamente mais tarde.', 'retry_after': retry},
        status=429,
    )
    resp['Retry-After'] = str(retry)
    return resp
```

**Atenção:** `registrar_falha` é chamado em TODA requisição (inclusive as bem-sucedidas), porque o rate limit conta importações, não falhas. Esta é uma diferença semântica importante em relação ao rate limit de autenticação (que só conta falhas). Chamar antes de processar o arquivo garante que seja contada antes de qualquer I/O.

### D8 — Auditoria (`_log_rejeicao`)

```python
import logging
_nfe_logger = logging.getLogger('api.nfe')

def _log_rejeicao(request, status, motivo):
    user_data = getattr(request, 'user_data', {}) or {}
    _nfe_logger.warning(
        'NFe rejeição status=%d motivo=%s ip=%s user_id=%s tenant_id=%s',
        status, motivo,
        ip_do_cliente(request),
        user_data.get('user_id', '?'),
        user_data.get('tenant_id', '?'),
    )
```

O logger `api.nfe` deve ser adicionado ao dict `LOGGING` em `settings.py`.

### D9 — Novas configurações em `settings.py`

```python
NFE_MAX_SIZE_BYTES = int(os.environ.get('NFE_MAX_SIZE_BYTES', 2 * 1024 * 1024))
NFE_MAX_ITENS = int(os.environ.get('NFE_MAX_ITENS', 500))
NFE_MAX_IMPORTACOES = int(os.environ.get('NFE_MAX_IMPORTACOES', 20))
NFE_JANELA_SEGUNDOS = int(os.environ.get('NFE_JANELA_SEGUNDOS', 600))
NFE_BLOQUEIO_SEGUNDOS = int(os.environ.get('NFE_BLOQUEIO_SEGUNDOS', 600))
```

`NFE_MAX_SIZE_BYTES` já é lido por `getattr(settings, ...)` em nfe.py mas nunca declarado em settings.py. Formalizar aqui para poder alterar por env.

### D10 — Frontend: countdown 429

Adicionar estado `xmlRetryAfter` e `xmlRetryTimer` ao `AddProductModal`. No bloco `catch` de `handleXmlFile`:

```javascript
if (err.response?.status === 429) {
    const ra = err.response?.data?.retry_after || 60;
    setXmlRetryAfter(ra);
    // intervalo limpo na desmontagem via useEffect cleanup
}
setXmlError(err.response?.data?.message || 'Não foi possível ler o XML da NF-e.');
```

Gerenciar o intervalo com `useEffect` dependente de `xmlRetryAfter`:

```javascript
useEffect(() => {
    if (xmlRetryAfter <= 0) return;
    const t = setInterval(() => setXmlRetryAfter(n => Math.max(0, n - 1)), 1000);
    return () => clearInterval(t);
}, [xmlRetryAfter > 0]);   // re-executa apenas quando muda de 0 para >0
```

Na `renderXml`, quando `xmlRetryAfter > 0`:
- O dropzone recebe `onClick={undefined}` e cursor diferente.
- Exibir abaixo do erro: `Tente novamente em {xmlRetryAfter}s`.

Não é necessária uma nova variável de ref: o `useEffect` com cleanup é suficiente.

## Risks / Trade-offs

| Risco | Mitigação |
|---|---|
| `registrar_falha` conta importações bem-sucedidas (não só falhas) | É o comportamento correto: limitar importações por volume, não por erros; documentado em D7 |
| `_validar_nome` rejeita nomes sem extensão (stem vazio) | Aceitável: nome sem extensão não é XML válido |
| `defusedxml.DefusedXmlException` pode não existir em versões antigas do defusedxml | Verificar em requirements.txt; defusedxml >= 0.7.0 garante a classe base |
| Content-Type ausente em raw body aceita qualquer conteúdo até o sniff | O sniff de conteúdo é a verificação real; Content-Type é apenas filtro adicional e seu campo ausente é tratado como `application/octet-stream` |
| Countdown de 429 no frontend usa `setInterval` | O `useEffect` com cleanup garante que o intervalo seja limpo na desmontagem |
