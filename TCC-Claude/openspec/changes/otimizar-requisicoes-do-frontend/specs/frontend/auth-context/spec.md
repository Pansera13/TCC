# Spec Delta

## ADDED Requirements

### Requirement: Profile fetch único no AuthContext
O `AuthProvider` SHALL buscar `GET /api/profile` uma única vez após a montagem e SHALL disponibilizar o resultado (avatar, role, permissões) via contexto para todos os consumidores. A revalidação SHALL ocorrer somente após uma chamada bem-sucedida a `PUT /api/profile`. Componentes que hoje chamam `GET /api/profile` individualmente (Dashboard, TopNav) SHALL passar a consumir o dado do contexto.

#### Scenario: Carga inicial do painel
- **WHEN** o usuário abre o painel após fazer login
- **THEN** exatamente uma requisição `GET /api/profile` é feita, independentemente de quantos componentes consomem o perfil

#### Scenario: Atualização do perfil
- **WHEN** o usuário salva uma alteração de nome ou foto via `PUT /api/profile`
- **THEN** o contexto revalida os dados do perfil com uma nova requisição `GET /api/profile` e todos os consumidores recebem o dado atualizado

#### Scenario: Falha ao buscar perfil
- **WHEN** `GET /api/profile` falha na montagem (rede, servidor)
- **THEN** o contexto mantém os dados já armazenados no sessionStorage e não exibe erro ao usuário

#### Scenario: StrictMode não duplica a busca em produção
- **WHEN** a aplicação roda em produção (StrictMode não monta duas vezes)
- **THEN** há exatamente uma requisição `GET /api/profile` na carga inicial
