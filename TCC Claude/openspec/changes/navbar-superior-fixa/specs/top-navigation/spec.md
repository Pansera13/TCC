## ADDED Requirements

### Requirement: Barra de navegação superior sempre visível
O Dashboard SHALL exibir uma barra de navegação fixa no topo da tela, sempre visível, com todas as opções de menu à mostra, e SHALL NOT ter sidebar lateral escondida nem gatilho por hover ou botão de hambúrguer.

#### Scenario: Opções visíveis sem interação
- **WHEN** o usuário abre o Dashboard
- **THEN** todas as opções de menu a que ele tem acesso aparecem na barra superior sem precisar de hover ou clique para revelá-las

#### Scenario: Opção administrativa
- **WHEN** o usuário não é admin
- **THEN** as opções marcadas como `adminOnly` não aparecem na barra

#### Scenario: Troca de aba
- **WHEN** o usuário clica numa opção da barra
- **THEN** a aba correspondente é exibida e a opção fica destacada como ativa

#### Scenario: Barra permanece ao rolar
- **WHEN** o usuário rola o conteúdo da página
- **THEN** a barra continua fixa no topo

### Requirement: Altura máxima da barra
A barra de navegação superior SHALL ter altura de no máximo 1,5 cm.

#### Scenario: Altura limitada
- **WHEN** a barra é renderizada em qualquer largura de tela
- **THEN** sua altura não excede 1,5 cm

#### Scenario: Tela estreita
- **WHEN** a largura não comporta ícone e rótulo de todas as opções
- **THEN** os rótulos são ocultados (ficam só os ícones) e, se ainda não couber, a barra rola horizontalmente sem aumentar de altura

### Requirement: Perfil e tema na barra
A barra SHALL conter, à direita, o alternador de tema e o avatar do usuário com menu (alterar foto, alterar nome, sair da conta), que abre para baixo sem ser cortado pelo limite de altura da barra.

#### Scenario: Abrir menu do perfil
- **WHEN** o usuário clica no avatar
- **THEN** o menu aparece abaixo da barra com as três ações, e fecha ao clicar fora

#### Scenario: Sair da conta
- **WHEN** o usuário clica em "Sair da conta"
- **THEN** a sessão é encerrada como hoje
