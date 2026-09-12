# Estoque NFC-e

Sistema web (PWA) de estoque automático: lê o **QR Code de uma NFC-e** (ou o XML da
nota) e dá entrada de todos os produtos no estoque com o mínimo de trabalho manual.
Funciona no navegador de **celular e computador** a partir da mesma URL. Quando o
portal da SEFAZ está fora do ar ou traz dados incompletos, o usuário pode
**inserir/editar os itens manualmente** — nunca fica bloqueado.

## Arquitetura

- `backend/` — API Node.js + Express (TypeScript). Banco **SQLite** embutido
  (`node:sqlite`, sem compilação nativa) em dev; o schema é portável para
  PostgreSQL em produção. Autenticação por sessão em cookie httpOnly.
- `frontend/` — PWA em React + TypeScript (Vite). Leitura de QR/código de barras
  no navegador (`BarcodeDetector` com fallback `@zxing/browser`).

Capacidades (specs em `openspec/`): `user-auth`, `nfe-scanning`, `nfe-import`,
`inventory`.

## Pré-requisitos e instalação (passo a passo)

Ferramentas usadas no projeto:

| Ferramenta | Versão de referência | Papel | Obrigatória? |
|---|---|---|---|
| **Node.js** | >= 22 (testado no 24) | Executa backend e ferramentas de build | Sim |
| **npm** | vem com o Node (v12+) | Gerencia dependências (workspaces) | Sim |
| **Git** | 2.x | Clonar e versionar o repositório | Sim |
| **OpenSpec CLI** | 1.13.0 | Fluxo *spec-driven* (specs em `openspec/`) | Recomendada |
| **mkcert** | 1.x | Certificado HTTPS confiável para testar câmera no celular | Opcional |

### 1. Node.js e npm

Baixe o instalador **LTS >= 22** em <https://nodejs.org> (o npm vem junto). Confirme:

```bash
node -v   # deve mostrar v22 ou superior
npm -v
```

> No Windows, marque a opção "Add to PATH" durante a instalação. Alternativamente,
> use o [nvm-windows](https://github.com/coreybutler/nvm-windows): `nvm install 22`.

### 2. Git

Instale de <https://git-scm.com/downloads> e confirme com `git --version`.

### 3. Clonar o repositório e instalar as dependências

```bash
git clone <URL-do-repositorio>
cd TCC
npm install
```

O `npm install` instala as dependências de **backend** e **frontend** (workspaces),
incluindo `cross-env` (usado pelo script `dev:https`). Não é preciso rodar
`npm install` dentro de cada pasta.

### 4. OpenSpec CLI (fluxo spec-driven)

As especificações do projeto ficam em `openspec/` (schema `spec-driven`, ver
`openspec/config.yaml`). Para usar a CLI, instale-a **globalmente**:

```bash
npm install -g openspec
openspec --version        # deve mostrar 1.13.0 ou superior
```

Comandos úteis (rodados na raiz do projeto):

```bash
openspec list             # lista as mudanças (changes)
openspec list --specs     # lista as specs (user-auth, nfe-scanning, nfe-import, inventory)
openspec view             # dashboard interativo de specs e changes
openspec doctor           # verifica a saúde das relações entre specs/changes
```

> Sem instalar globalmente, também é possível executar sob demanda com
> `npx openspec <comando>`. A instalação global é apenas mais conveniente.

### 5. mkcert (opcional — HTTPS confiável no celular)

Necessário só para testar a **câmera no celular** sem o aviso de certificado. Veja
[Testar no celular pela rede](#testar-no-celular-pela-rede-com-câmera). Instalação em
<https://github.com/FiloSottile/mkcert> (no Windows: `choco install mkcert` ou
`scoop install mkcert`).

## Rodar em desenvolvimento

Sobe backend (porta 3000) e frontend (porta 5173) juntos:

```bash
npm run dev
```

Abra `http://localhost:5173`. O frontend faz proxy de `/api` para o backend, então
não há problema de CORS em dev.

Fluxo: **Cadastrar → Entrar → Importar nota** (escanear QR, ou colar a chave de 44
dígitos, ou enviar o XML) → **Revisar** os itens (adicionar/editar/remover) →
**Confirmar** → conferir saldo e histórico no catálogo.

### HTTP (padrão) x HTTPS

O servidor de desenvolvimento sobe em **HTTP por padrão**, sem aviso de certificado.
Em `http://localhost:5173` a **câmera funciona normalmente**, porque o navegador
trata `localhost` como contexto seguro.

O HTTPS só é necessário para abrir o app **em outro dispositivo pela rede** (ex.:
celular via `https://192.168.0.10:5173`), pois `http://<IP-da-rede>` é tratado como
inseguro e a câmera não abre. Nesse caso, use o script dedicado:

```bash
npm run dev:https -w frontend
```

Ele ativa o certificado autoassinado (`@vitejs/plugin-basic-ssl`). O navegador vai
exibir "sua conexão não é privada" — é esperado num certificado autoassinado; basta
clicar em **Avançado → Prosseguir**. Internamente, o script apenas define a variável
`VITE_HTTPS=1` (via `cross-env`, para funcionar igual no Windows/macOS/Linux); sem
ela, o Vite continua em HTTP limpo.

### Testar no celular pela rede (com câmera)

1. Descubra o IP do computador na rede (ex.: `192.168.0.10`).
2. Rode o frontend em HTTPS: `npm run dev:https -w frontend` (e o backend com
   `npm run dev -w backend`).
3. No celular (mesma Wi-Fi), acesse `https://192.168.0.10:5173` e aceite o aviso do
   certificado.

**Sem aviso nenhum (certificado confiável):** em vez do passo 2, gere um certificado
local com [mkcert](https://github.com/FiloSottile/mkcert) e aponte o **backend** para
ele:

```bash
mkcert -install
mkcert 192.168.0.10 localhost
# backend em HTTPS com o certificado confiável
TLS_KEY_FILE=./192.168.0.10-key.pem TLS_CERT_FILE=./192.168.0.10.pem npm run dev -w backend
```

Sem HTTPS, a câmera não abre no celular, mas **a entrada manual da chave e o upload
de XML continuam funcionando**.

## Variáveis de ambiente

**Backend:**

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3000` | Porta da API |
| `HOST` | `0.0.0.0` | Interface (0.0.0.0 = acessível na rede) |
| `DATABASE_FILE` | `data/dev.db` | Caminho do SQLite (`:memory:` em testes) |
| `TLS_KEY_FILE` / `TLS_CERT_FILE` | — | Habilitam HTTPS quando presentes |
| `CORS_ORIGINS` | — | Origens permitidas (deploy com domínios separados) |

**Frontend (Vite):**

| Variável | Padrão | Descrição |
|---|---|---|
| `VITE_HTTPS` | — | `1`/`true` serve o dev em HTTPS (certificado autoassinado). Usada pelo script `dev:https`. |
| `VITE_API_TARGET` | `http://localhost:3000` | Alvo do proxy `/api` em desenvolvimento |

## Fonte de dados da NFC-e

A obtenção dos itens fica atrás da interface `NotaFiscalProvider`
(`backend/src/nfe/`). Há três caminhos, do mais confiável ao mais frágil:

- **XML da nota (`parseNfeXml`, `xmlProvider.ts`)** — importa a partir do XML da
  NFC-e/NF-e. Funciona para **qualquer estado**, sem depender de portal externo, e é
  o caminho recomendado. Endpoint `POST /nfe/preview-xml`. Extrai descrição, GTIN
  (tratando "SEM GTIN" como ausente), quantidade, unidade e valor unitário.
- **Consulta automática na SEFAZ (`SefazHtmlProvider`, `sefazHtmlProvider.ts`)** —
  faz *scraping* da página pública da SEFAZ. O mapa de URLs por UF está em
  `CONSULTA_URL_BY_UF`; o exemplo incluso é **RS (43)**. Endpoint `POST /nfe/preview`.
- **Entrada manual** — a tela de revisão sempre permite adicionar/editar/remover
  itens, então o usuário nunca fica bloqueado quando o automático falha.

### ⚠️ Limitação importante da consulta automática

A consulta pública de NFC-e **não aceita apenas os 44 dígitos da chave de acesso**.
O portal exige o **conteúdo completo do QR Code**, com vários campos separados por
`|`:

```
chNFe | nVersao | tpAmb | dhEmi | vNF | vICMS | digVal | cHashQRCode
```

Enviando só a chave, o portal da SEFAZ-RS **redireciona** para
`dfe-portal.svrs.rs.gov.br` e responde **"902 - Parâmetros informados inválidos"**,
sem retornar a tabela de itens. Consequências práticas:

- **Chave digitada na mão não puxa os itens** automaticamente — falta o hash/QR.
- Para a consulta automática funcionar é preciso **escanear o QR Code completo** (e
  encaminhar todo o payload à SEFAZ, não só a chave).
- O caminho **garantido** hoje é o **upload do XML**.

> A consulta automática também depende do portal da SEFAZ, que pode mudar de layout
> ou ficar indisponível — mais um motivo para a revisão manual sempre existir.

### Como obter uma chave/XML real para testar

Toda NFC-e (cupom de compra) traz impressos os **44 dígitos da chave** e o **QR Code**
(que contém a chave **+** os parâmetros exigidos). Para testar:

| Você tem | Onde usar no app | Funciona? |
|---|---|---|
| **QR Code** do cupom | Câmera / foto | ✅ tem os parâmetros completos |
| **XML** da nota | Aba "Chave / XML" → enviar XML | ✅ (caminho recomendado) |
| **Só os 44 dígitos** digitados | Consulta automática | ❌ SEFAZ recusa (902) |

Para baixar o XML, use um cupom real: pegue a chave de 44 dígitos impressa, acesse o
**portal da SEFAZ do estado emissor** (os 2 primeiros dígitos indicam a UF — `43` =
RS) e baixe o XML/DANFE. Há um arquivo de exemplo em `nota-teste.xml` na raiz do
repositório (RS, 3 itens) para testar o fluxo de importação por XML.

## Testes

```bash
npm test          # suíte do backend (node:test)
npm run build     # typecheck + build de backend e frontend
npm run lint      # ESLint em ambos
```

## Solução de problemas

**"Sua conexão não é privada" / "a rede não é privada" ao abrir o app.**
É o aviso do certificado **autoassinado** do modo HTTPS. Em desenvolvimento no PC,
use `npm run dev` (HTTP) e acesse `http://localhost:5173` — sem aviso e com câmera.
O HTTPS (`npm run dev:https`) só é necessário para testar a câmera no celular pela
rede; nesse caso o aviso é esperado (clique em **Avançado → Prosseguir**) ou use
`mkcert` para um certificado confiável.

**"Falha ao consultar a nota."**
Mensagem genérica que aparece quando o navegador **não consegue falar com o backend**
(a resposta não é um JSON de erro). Verifique se:

1. O **backend está rodando** na porta 3000 (`npm run dev` sobe backend + frontend).
2. Você está acessando pela URL do **frontend** (`5173`), que faz proxy de `/api`.

Se a chave for válida mas a consulta automática falhar com **"902 - Parâmetros
informados inválidos"** (ou não retornar itens), é a limitação descrita em
[Fonte de dados da NFC-e](#fonte-de-dados-da-nfc-e): use o **XML** ou escaneie o
**QR Code completo**.

## Produção (deploy)

1. `npm run build` (gera `backend/dist` e `frontend/dist`).
2. Publique a API (`node backend/dist/server.js`) com `NODE_ENV=production`, um
   banco PostgreSQL e `CORS_ORIGINS` apontando para o domínio do frontend.
3. Sirva `frontend/dist` como site estático (Netlify, Vercel, Nginx...).
4. Tudo sob **HTTPS** (requisito da câmera e do cookie seguro).

## Histórico de alterações

### 2026-09-11

- **HTTPS agora é opcional em desenvolvimento.** O servidor sobe em HTTP por padrão
  (sem o aviso "sua conexão não é privada"); o HTTPS é ativado sob demanda pela
  variável `VITE_HTTPS` / pelo novo script `dev:https`.
- Adicionado o script **`npm run dev:https -w frontend`** e a dependência `cross-env`
  (compatível com Windows/macOS/Linux).
- Documentada a **limitação da consulta automática da SEFAZ**: o portal exige o QR
  Code completo (erro "902 - Parâmetros informados inválidos" quando se envia só a
  chave). Reforçado o fluxo por **XML** como caminho recomendado.
- Adicionado **passo a passo de instalação dos requisitos** (Node.js, Git, OpenSpec
  CLI, mkcert) e a seção **Solução de problemas**.
- Atualizadas as seções de variáveis de ambiente (incluindo as do frontend) e de
  fonte de dados da NFC-e.
