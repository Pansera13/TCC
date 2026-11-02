# Spec: auth/login

## Purpose

Ponto de entrada do StockFlow: permite que usuários cadastrados autentiquem-se usando nome da empresa, CNPJ ou CPF combinado com senha, com suporte a tema claro/escuro e atalhos para cadastro e recuperação de acesso.

## Requirements

### Requirement: Identificação flexível

O sistema DEVE aceitar como identificador no campo de login qualquer um dos três valores: nome da empresa, CNPJ (formato `00.000.000/0001-00`) ou CPF (formato `000.000.000-00`). O campo DEVE formatar automaticamente CNPJ e CPF conforme o usuário digita, detectando o tipo pelo comprimento e presença de caracteres.

#### Scenario: Login com nome da empresa

- **WHEN** usuário informa o nome da empresa cadastrada e a senha correta e clica em ENTRAR
- **THEN** sistema autentica o usuário e redireciona para o dashboard

#### Scenario: Login com CNPJ formatado automaticamente

- **WHEN** usuário digita 14 dígitos no campo identificador
- **THEN** sistema formata automaticamente como `00.000.000/0001-00` em tempo real

#### Scenario: Login com CPF formatado automaticamente

- **WHEN** usuário digita 11 dígitos no campo identificador
- **THEN** sistema formata automaticamente como `000.000.000-00` em tempo real

#### Scenario: Credenciais inválidas

- **WHEN** usuário informa identificador ou senha incorretos
- **THEN** sistema exibe mensagem genérica "Usuário ou senha inválidos" sem revelar qual campo está errado

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

### Requirement: Alternador dark/light mode

O sistema DEVE oferecer botão no canto superior direito da página para alternar entre modo claro (degradê branco → #E879F9) e modo escuro (degradê preto → #7C3AED). A preferência DEVE ser salva em localStorage e restaurada na próxima visita.

#### Scenario: Alternância para modo escuro

- **WHEN** usuário clica no alternador estando no modo claro
- **THEN** o fundo muda para degradê preto → roxo (#7C3AED) e o card adapta suas cores

#### Scenario: Preferência persistida

- **WHEN** usuário recarrega a página após ter escolhido um modo
- **THEN** o modo escolhido anteriormente é restaurado automaticamente

### Requirement: Rodapé social

A tela de login DEVE exibir os botões de GitHub e LinkedIn no canto inferior esquerdo através do componente global `SocialLinks` (ver `ui/social-links-global`). O componente SHALL ser o mesmo utilizado em todas as outras telas da aplicação, garantindo aparência e comportamento consistentes. A implementação inline dos botões na tela de login DEVE ser substituída pelo componente compartilhado.

#### Scenario: Abertura dos links sociais

- **WHEN** usuário clica em qualquer ícone do rodapé na tela de login
- **THEN** o respectivo link abre em nova aba sem navegar para fora da tela de login
