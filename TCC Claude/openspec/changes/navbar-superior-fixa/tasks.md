## 1. Componente da barra

- [x] 1.1 Criar `frontend/src/components/TopNav.jsx`: logo, itens de `navItems` (ícone + rótulo, ativo destacado), `ThemeToggle` e avatar com menu de perfil (alterar foto, alterar nome, sair), `h-14` com `maxHeight: 1.5cm`
- [x] 1.2 Posicionar o menu do perfil fora do container rolável e manter o fechamento ao clicar fora
- [x] 1.3 Em telas estreitas ocultar rótulos e permitir rolagem horizontal sem aumentar a altura

## 2. Integração no Dashboard

- [x] 2.1 Substituir `<aside>`, backdrop e `<header>` por `<TopNav />` em `Dashboard.jsx`, passando os handlers de perfil já existentes
- [x] 2.2 Remover `sidebarVisible`, `sidebarRef`, o efeito de mousemove, o efeito `data-sidebar-open` e o ☰
- [x] 2.3 Ajustar o layout do wrapper/`main` para a barra fixa no topo e remover `activeLabel` se ficar sem uso

## 3. Estilos

- [x] 3.1 Remover a regra `html[data-sidebar-open] .social-links` de `frontend/src/index.css`

## 4. Verificação

- [x] 4.1 Conferir altura ≤ 1,5 cm, troca de abas com destaque da ativa e itens `adminOnly` ocultos para operador
- [x] 4.2 Conferir tema claro/escuro, menu do perfil (foto, nome, sair), tela estreita e botões sociais flutuantes sem sobreposição
