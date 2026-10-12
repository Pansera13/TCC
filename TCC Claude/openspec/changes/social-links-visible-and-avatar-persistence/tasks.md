# Tasks

## 1. Componente SocialLinks

- [x] 1.1 Criar `frontend/src/components/SocialLinks.jsx` com os dois botões circulares (GitHub e LinkedIn) usando os SVGs e classes Tailwind extraídos de `Login.jsx` (bloco `{/* Rodapé social */}`, linhas 176-193). Verificar: componente renderiza sem erro com os dois ícones visíveis.
- [x] 1.2 Adicionar `position: fixed; bottom: 0; left: 0` via classes Tailwind (`fixed bottom-0 left-0 flex gap-4 p-6 z-50`) ao wrapper do componente. Verificar: botões ficam sobrepostos ao conteúdo no canto inferior esquerdo sem afetar o layout principal.

## 2. Integração no App.jsx

- [x] 2.1 Importar e renderizar `<SocialLinks />` em `frontend/src/App.jsx`, fora do `<Routes>`, de forma que apareça em todas as rotas. Verificar: os botões são visíveis simultaneamente na tela de login, register, forgot-password e dashboard.

## 3. Limpeza do Login.jsx

- [x] 3.1 Remover o bloco `{/* Rodapé social */}` (as tags `<div>`, `<a>` e SVGs do rodapé) de `frontend/src/pages/Login.jsx` (linhas 175-193). Verificar: não há duplicação de botões na tela de login após a remoção.

## 4. Limpeza do Dashboard.jsx (sidebar)

- [x] 4.1 Remover a seção `{/* Bottom links */}` com os dois `<a>` de LinkedIn e GitHub de `frontend/src/pages/Dashboard.jsx` (linhas 572-590). Verificar: a sidebar não exibe mais os links de texto de LinkedIn e GitHub.

## 5. Persistência do Avatar no AuthContext

- [x] 5.1 Em `frontend/src/context/AuthContext.jsx`, atualizar a função `updateUser` para que, quando `fields.avatarUrl` estiver presente, também salve em `localStorage.setItem('avatar_' + user.id, fields.avatarUrl)`. Verificar: após `updateUser({ avatarUrl: '...' })`, a chave `avatar_<id>` existe no localStorage.
- [x] 5.2 Atualizar a função `loginUser` para, após salvar token e user, ler `localStorage.getItem('avatar_' + id)` e incluir `avatarUrl` no objeto do usuário se existir. Verificar: após logout e re-login com a mesma conta, `user.avatarUrl` retorna o valor salvo anteriormente.
- [x] 5.3 Confirmar que `logoutUser` não remove a chave `avatar_<userId>` do localStorage. Verificar: após logout, a chave `avatar_<id>` ainda existe no localStorage.

## 6. Validação end-to-end

- [x] 6.1 Testar o fluxo completo: definir foto → fazer logout → fazer login → confirmar que a foto está presente no perfil. Verificar: foto exibida no avatar da sidebar sem necessidade de reenvio.
- [x] 6.2 Testar que os botões de GitHub e LinkedIn aparecem em todas as abas do dashboard (Início, Produtos, Categorias, Movimentações, Equipe) e na tela de login, abrindo os links corretos em nova aba.
