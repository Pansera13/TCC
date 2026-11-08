# Spec Delta

## MODIFIED Requirements

### Requirement: Tela de confirmação antes de importar
O sistema SHALL exibir todos os produtos extraídos do XML para revisão antes de qualquer adição ao estoque. O usuário SHALL poder confirmar ou cancelar a importação inteira. Ao confirmar, o frontend SHALL enviar uma única requisição a `POST /api/products/lote` com todos os itens; a mensagem de sucesso SHALL exibir os totais de produtos criados e empilhados retornados pelo servidor, idênticos ao que seria exibido com requisições individuais.

#### Scenario: Usuário confirma importação
- **WHEN** o usuário revisa a lista de produtos extraídos e clica em "Confirmar e Adicionar"
- **THEN** o sistema envia uma única requisição a `POST /api/products/lote` com todos os produtos e o `nfe_chave` propagado, e fecha o modal após receber a resposta

#### Scenario: Usuário cancela importação
- **WHEN** o usuário clica em "Cancelar" na tela de confirmação
- **THEN** nenhum produto é adicionado e o modal fecha sem registrar nenhuma movimentação

#### Scenario: Erro parcial na importação
- **WHEN** o servidor responde erro ao processar o lote
- **THEN** nenhum produto é salvo (rollback completo) e o modal exibe a mensagem de erro retornada pelo servidor

#### Scenario: Totais exibidos ao usuário
- **WHEN** a importação é bem-sucedida e o servidor retorna `{ "criados": 5, "empilhados": 3 }`
- **THEN** o modal exibe uma mensagem com "5 produtos criados, 3 empilhados" (ou equivalente), idêntica ao que seria exibido antes desta change
