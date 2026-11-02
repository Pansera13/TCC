## Context

`Dashboard.jsx` renderiza hoje um `<aside>` fixo (w-56) que desliza para dentro por `translate-x`, aberto por mousemove na faixa de 113px da borda esquerda ou pelo ☰ do header, com backdrop. Ele contém logo, `navItems` (filtrados por `adminOnly` a partir de `ALL_NAV_ITEMS`), links GitHub/LinkedIn e a área de perfil (menu inline com alterar foto/nome/sair). O header traz o título da aba, a saudação e o `ThemeToggle`. `index.css` oculta `.social-links` quando `html[data-sidebar-open]`.

## Goals / Non-Goals

**Goals:** barra superior fixa, opções à mostra, ≤ 1,5 cm, perfil e tema acessíveis, funcionar em mobile.
**Non-Goals:** mudar a lista de abas, o conteúdo das abas, ou os botões sociais flutuantes.

## Decisions

- **Substituir sidebar + header por uma única barra** `<nav>` (topo do flex-col), extraída em `frontend/src/components/TopNav.jsx` recebendo `items`, `activeNav`, `onSelect`, `user`, `darkMode`, `onToggleDark` e os handlers de perfil já existentes. Evita inchar mais o `Dashboard.jsx`.
- **Altura:** `h-14` (56 px ≈ 1,48 cm) com `style={{ maxHeight: '1.5cm' }}` como garantia do limite; menus em `absolute` fora do fluxo.
- **Itens:** botões compactos `px-3 py-1.5 text-sm`, ícone + rótulo (`hidden sm:inline` no rótulo); ativo com `bg-purple-100 text-purple-700` (mesmo estilo atual). Container `flex-1 overflow-x-auto` para telas estreitas.
- **Perfil:** botão com avatar (≈ 32 px) e nome oculto em telas pequenas; menu `absolute right-0 top-full mt-1` reaproveitando o JSX atual (foto, nome, sair); o clique-fora existente (`profileRef`) continua.
- **Fundo:** `bg-white dark:bg-gray-900` com `shadow-sm border-b`, como o header atual; o degradê da página permanece no wrapper.
- **Remoções:** `sidebarVisible`, `sidebarRef`, efeito de mousemove, efeito de `data-sidebar-open`, backdrop, `<aside>`, o ☰ e a regra CSS correspondente. Título e saudação saem (a aba ativa já fica destacada); `activeLabel` só é mantido se ainda for usado.
- **Layout:** o wrapper `h-screen overflow-hidden` vira coluna (`flex-col`); a barra fica no topo e o `main` mantém `overflow-auto` e o padding atual, rolando sob a barra.
- Alternativa descartada: manter a sidebar e só fixá-la — ocupa largura e contraria o pedido de barra no topo.

## Risks / Trade-offs

- Muitas abas (até 5) + logo + perfil podem não caber em ~1024 px → rótulos somem abaixo de `lg` se necessário e há rolagem horizontal como último recurso.
- Menu do perfil dentro de container com `overflow-x-auto` seria cortado → posicionar o menu fora do container rolável (irmão, não filho).
- A barra lê `ALL_NAV_ITEMS` como estiver no momento (hoje ainda com Categorias; Relatórios entra pela change `reorganizar-abas-dashboard`).
- Ordem com `reorganizar-abas-dashboard`: ambas tocam `Dashboard.jsx` e a navegação; aplicar uma por vez e reconciliar `ALL_NAV_ITEMS`.
- Perde-se a saudação "Bem-vindo, nome" e o título da aba; o nome aparece junto ao avatar em telas largas.
