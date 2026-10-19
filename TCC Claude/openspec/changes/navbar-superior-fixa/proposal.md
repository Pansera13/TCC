# Proposal

## Why

A navegação do Dashboard fica numa sidebar escondida que só aparece ao aproximar o mouse da borda esquerda ou clicar no ☰. Isso esconde as opções do usuário, não funciona bem em telas de toque e ainda obriga a ocultar os botões sociais enquanto abre. Uma barra sempre visível no topo deixa as opções à mostra o tempo todo.

## What Changes

- **Remover** a sidebar lateral escondida: gatilho por hover na borda esquerda, botão ☰, backdrop e o atributo `data-sidebar-open` que ocultava os botões sociais.
- **Criar** uma barra de navegação fixa no topo, sempre visível, com altura máxima de 1,5 cm, contendo:
  - logo + nome "StockFlow" à esquerda;
  - todas as opções de menu (as mesmas de hoje, respeitando `adminOnly`) com ícone e rótulo, destacando a ativa;
  - à direita, alternador de tema e avatar do usuário com menu (alterar foto, alterar nome, sair), que abre para baixo.
- O título da página e a saudação que ficavam no header antigo deixam de ocupar uma segunda faixa; a barra única substitui header + sidebar.
- Os links de GitHub/LinkedIn dentro da sidebar saem; permanecem os botões sociais flutuantes já existentes (`SocialLinks`).
- Em telas estreitas as opções mostram só o ícone e a barra rola horizontalmente se necessário (suposição).
- O conteúdo (`main`) passa a ocupar toda a largura abaixo da barra.

## Capabilities

### New Capabilities
- `top-navigation`: barra de navegação superior fixa do Dashboard, com opções de menu à mostra, perfil e tema, altura máxima de 1,5 cm.

### Modified Capabilities

## Impact

- `frontend/src/pages/Dashboard.jsx`: remoção de `sidebarVisible`/`sidebarRef`, do efeito de mousemove e do `<aside>`; uso da nova barra; ajuste do layout do `main`.
- `frontend/src/index.css`: remover a regra `html[data-sidebar-open] .social-links`.
- Novo componente `frontend/src/components/TopNav.jsx`.
- Interação com a change em andamento `reorganizar-abas-dashboard`, que altera a lista de abas (`ALL_NAV_ITEMS`): a barra lê a mesma lista, então são compatíveis, mas a ordem de aplicação deve ser observada.
- Somente classes Tailwind e estado de UI; sem mudanças de API ou banco.
