# Spec: ui/social-links-global

## Purpose

Componente de links sociais (GitHub e LinkedIn) sempre visível em posição fixa no canto inferior esquerdo da tela, presente em todas as telas do sistema, com estilo de círculo translúcido e ícones SVG coloridos.

## Requirements

### Requirement: Links sociais globais fixos

O sistema DEVE exibir um componente fixo no canto inferior esquerdo da tela, posicionado com `position: fixed`, sobrepondo qualquer conteúdo, presente em todas as telas da aplicação (tela de login, dashboard e todas as abas do dashboard). O componente SHALL conter dois botões: GitHub e LinkedIn.

#### Scenario: Visível na tela de login

- **WHEN** o usuário acessa a tela de login
- **THEN** os botões de GitHub e LinkedIn são exibidos no canto inferior esquerdo, fixos e visíveis

#### Scenario: Visível em todas as abas do dashboard

- **WHEN** o usuário navega entre quaisquer abas do dashboard (Início, Produtos, Categorias, Movimentações, Equipe)
- **THEN** os botões de GitHub e LinkedIn permanecem fixos no canto inferior esquerdo, sobrepostos ao conteúdo principal

#### Scenario: Links abrem em nova aba

- **WHEN** usuário clica no botão de GitHub ou LinkedIn
- **THEN** o respectivo link abre em uma nova aba do navegador sem navegar para fora da tela atual

### Requirement: Estilo dos botões sociais

Cada botão social DEVE ser um círculo de 40×40 px com fundo branco semitransparente (`bg-white/40 dark:bg-white/10`), efeito hover com fundo mais opaco, sombra sutil e ícone SVG de 20×20 px. O ícone do GitHub DEVE ser cinza escuro no modo claro e cinza claro no modo escuro. O ícone do LinkedIn DEVE ser azul (`fill-blue-600 dark:fill-blue-400`). O layout DEVE exibir os dois botões em linha horizontal com espaçamento de `gap-4` e padding de `p-6`.

#### Scenario: Aparência no modo claro

- **WHEN** o sistema está no modo claro
- **THEN** o botão do GitHub exibe ícone SVG cinza escuro e o botão do LinkedIn exibe ícone azul, ambos sobre fundo branco semitransparente

#### Scenario: Aparência no modo escuro

- **WHEN** o sistema está no modo escuro
- **THEN** os botões adaptam o fundo para branco mais translúcido e o ícone do GitHub fica cinza claro, mantendo o LinkedIn azul claro
