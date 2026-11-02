# Design

## Context

O Dashboard atual (`Dashboard.jsx`) usa uma sidebar deslizante ativada por hover/clique. Os links de LinkedIn e GitHub vivem na seção inferior da sidebar como itens de texto com emoji, invisíveis até que o usuário abra o menu. A tela de login (`Login.jsx`) já possui uma implementação inline dos botões sociais com círculos SVG posicionados no rodapé esquerdo — é exatamente esse estilo que o usuário quer globalmente.

Para o avatar, o `AuthContext` salva `avatarUrl` no localStorage dentro da chave `user` via `updateUser`. O problema é que `loginUser` reescreve `user` sem incluir `avatarUrl`, apagando a foto a cada re-login. Ver proposal.md — Why para motivação completa.

## Goals / Non-Goals

**Goals:**
- Criar componente `SocialLinks` reutilizável com os SVGs de GitHub e LinkedIn, idêntico ao estilo da tela de login.
- Posicioná-lo como `fixed` bottom-left, visível em todas as rotas da aplicação.
- Remover os links de texto da sidebar.
- Salvar o avatar por `avatar_<userId>` no localStorage, independente da sessão.
- Restaurar o avatar automaticamente em `loginUser` consultando essa chave.

**Non-Goals:**
- Upload de avatar para o servidor/banco de dados (continua base64 em localStorage).
- Adicionar botão do WhatsApp (não mencionado pelo usuário para o componente global).
- Alterar o layout geral da sidebar ou do header.

## Decisions

### 1. Componente `SocialLinks` como `fixed` no nível de `App.jsx`

**Decisão:** Renderizar `<SocialLinks />` diretamente em `App.jsx`, fora das rotas, usando `position: fixed; bottom: 0; left: 0` via Tailwind (`fixed bottom-0 left-0`).

**Alternativa considerada:** Inserir em cada página individualmente (Login, Dashboard). Descartado: propenso a omissões e duplicação de código.

**Razão:** Uma única instância no root da app garante presença em todas as rotas, incluindo Login, Register, ForgotPassword e Dashboard, sem nenhuma alteração nas páginas.

### 2. Remoção do rodapé inline em `Login.jsx`

**Decisão:** Remover o bloco `{/* Rodapé social */}` de `Login.jsx` inteiro, já que `App.jsx` renderiza `<SocialLinks />` globalmente.

**Razão:** Evita dois conjuntos de botões sobrepostos na tela de login.

### 3. Remoção dos links de texto da sidebar em `Dashboard.jsx`

**Decisão:** Remover a seção `{/* Bottom links */}` com os `<a>` de LinkedIn e GitHub da sidebar.

**Razão:** Substituídos pelo componente global fixo.

### 4. Persistência do avatar por `avatar_<userId>` no localStorage

**Decisão:** `updateUser({ avatarUrl })` salva adicionalmente em `localStorage.setItem('avatar_<userId>', avatarUrl)`. `loginUser(token, nome, role, id)` após gravar o token lê `localStorage.getItem('avatar_<id>')` e inclui o valor no objeto `user` se existir. `logoutUser` não toca a chave `avatar_*`.

**Alternativa considerada:** Manter o avatar no objeto `user` e sempre passá-lo no login. Descartado: o backend não retorna o avatar e adicionar esse campo à resposta do login é fora do escopo deste change.

**Razão:** Separa o ciclo de vida do avatar (permanente por usuário) do ciclo de vida da sessão (efêmero). Base64 em localStorage é suficiente para o TCC; armazenamento no servidor seria escopo futuro.

## Risks / Trade-offs

- **Base64 grande no localStorage** → o avatar é uma imagem inteira encodada. Para o TCC isso é aceitável; em produção real exigiria upload para servidor.
- **Avatar não sincroniza entre dispositivos/navegadores** → aceitável para o escopo do projeto.
- **`fixed` pode cobrir conteúdo** → os botões ficam no canto inferior esquerdo com `z-50`. Em telas pequenas podem sobrepor o texto do rodapé da sidebar, mas a sidebar é um overlay e não tem rodapé fixo visível simultaneamente.

## Migration Plan

1. Criar `SocialLinks.jsx` com os SVGs e estilos extraídos de `Login.jsx`.
2. Adicionar `<SocialLinks />` em `App.jsx` (fora do `<Routes>`).
3. Remover o bloco inline de `Login.jsx`.
4. Remover a seção de links da sidebar em `Dashboard.jsx`.
5. Atualizar `AuthContext.jsx`: `updateUser` persiste avatar separado; `loginUser` restaura avatar; `logoutUser` não apaga avatar.
6. Sem migration de dados necessária — avatars existentes no campo `user.avatarUrl` do localStorage serão perdidos no primeiro re-login, mas o usuário pode reenviar. Considerando que o problema atual já faz perder a foto, não há regressão.
