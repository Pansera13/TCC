# Spec Delta

## MODIFIED Requirements

### Requirement: Visual da tela de login

A tela DEVE exibir fundo com degradê diagonal, logo animada com float suave (CSS keyframe: translação vertical de ±8px, duração 3s, infinita), nome "StockFlow" abaixo da logo, card centralizado com bordas arredondadas, campo senha com botão mostrar/ocultar, link "Esqueci minha senha" à esquerda, que leva à tela de recuperação de senha (`/forgot-password`), e link "Cadastrar-se" à direita acima do botão ENTRAR, e botão ENTRAR com gradiente chamativo.

#### Scenario: Animação da logo

- **WHEN** a tela de login é carregada
- **THEN** a logo flutua suavemente para cima e para baixo em loop contínuo sem interrupção

#### Scenario: Fundo branco da logo removido

- **WHEN** a logo é exibida sobre qualquer fundo (claro ou escuro)
- **THEN** o fundo branco da imagem PNG não é visível, usando mix-blend-mode CSS

#### Scenario: Link para recuperar a senha

- **WHEN** usuário clica em "Esqueci minha senha" na tela de login
- **THEN** o sistema abre a tela de recuperação de senha em `/forgot-password`
