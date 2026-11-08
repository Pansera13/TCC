# Proposal

## Why

Os botões de LinkedIn e GitHub estão escondidos dentro da sidebar deslizante, ficando invisíveis até o usuário abrir o menu — o que reduz a visibilidade dos links sociais do projeto. Além disso, a foto de perfil do usuário é apagada ao fazer logout e re-login, pois o `loginUser` sobrescreve o objeto de usuário no localStorage sem preservar o `avatarUrl` anteriormente salvo.

## What Changes

- Os botões de LinkedIn e GitHub são movidos da sidebar para um componente fixo sempre visível, posicionado no canto inferior esquerdo da tela, em todas as telas do sistema (login, dashboard e todas as abas).
- O estilo dos botões segue o padrão da tela de login: círculos com fundo translúcido e ícones SVG coloridos (GitHub cinza escuro / LinkedIn azul).
- Os links de texto "LinkedIn" e "GitHub" são removidos da seção inferior da sidebar.
- O `avatarUrl` do usuário passa a ser armazenado separadamente no localStorage, indexado pelo ID do usuário (`avatar_<userId>`), de forma que sobreviva ao ciclo logout/login.

## Capabilities

### New Capabilities

- `ui/social-links-global`: Componente fixo de links sociais (GitHub e LinkedIn) sempre visível em todas as telas, posicionado no canto inferior esquerdo, com estilo de círculo translúcido e ícones SVG idênticos aos da tela de login.
- `auth/avatar-persistence`: Foto de perfil do usuário persiste entre sessões (logout/login, fechamento do sistema), armazenada no localStorage indexada por ID de usuário e restaurada automaticamente no login.

### Modified Capabilities

- `auth/login`: Os botões sociais no canto inferior esquerdo da tela de login passam a ser renderizados pelo componente global `SocialLinks`, evitando duplicação.

## Impact

- `frontend/src/pages/Dashboard.jsx` — remoção dos links de texto da sidebar; adição do componente `SocialLinks`.
- `frontend/src/pages/Login.jsx` — substituição do rodapé social inline pelo componente `SocialLinks`.
- `frontend/src/context/AuthContext.jsx` — `loginUser` passa a restaurar o `avatarUrl` do localStorage por ID; `logoutUser` não apaga mais o avatar salvo.
- Novo arquivo: `frontend/src/components/SocialLinks.jsx`.
- `frontend/src/App.jsx` — verificar se `SocialLinks` precisa ser posicionado no nível raiz da aplicação.
