# Spec Delta

## MODIFIED Requirements

### Requirement: Rodapé social

A tela de login DEVE exibir os botões de GitHub e LinkedIn no canto inferior esquerdo através do componente global `SocialLinks` (ver `ui/social-links-global`). O componente SHALL ser o mesmo utilizado em todas as outras telas da aplicação, garantindo aparência e comportamento consistentes. A implementação inline dos botões na tela de login DEVE ser substituída pelo componente compartilhado.

#### Scenario: Abertura dos links sociais

- **WHEN** usuário clica em qualquer ícone do rodapé na tela de login
- **THEN** o respectivo link abre em nova aba sem navegar para fora da tela de login
