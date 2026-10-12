# Tasks

## 1. Backend — Coluna fornecedor

- [x] 1.1 Em `backend/src/createTable.js`, adicionar bloco try/catch após a criação da tabela `products` para executar `ALTER TABLE products ADD COLUMN fornecedor VARCHAR(150) NULL`. Verificar: executar `node backend/src/createTable.js` sem erros; coluna `fornecedor` presente na tabela via `DESCRIBE products`.
- [x] 1.2 Em `backend/src/controllers/productController.js`, atualizar `createProduct` para ler `fornecedor` do body e passá-lo no INSERT. Verificar: `POST /api/products` com `fornecedor: "Acme"` salva o valor no banco.
- [x] 1.3 Em `backend/src/controllers/productController.js`, atualizar `updateProduct` para ler `fornecedor` do body e incluí-lo no UPDATE. Verificar: `PUT /api/products/:id` com `fornecedor: "Nova Empresa"` atualiza o valor corretamente.
- [x] 1.4 Em `backend/src/controllers/productController.js`, confirmar que `listProducts` já retorna `fornecedor` via `SELECT *` (ou adicionar o campo explicitamente ao SELECT). Verificar: `GET /api/products` retorna o campo `fornecedor` em cada item.

## 2. Frontend — Campo fornecedor nos modais

- [x] 2.1 Em `frontend/src/components/AddProductModal.jsx`, adicionar campo "Fornecedor" (opcional, sem asterisco) ao estado inicial e ao formulário manual, enviando `fornecedor: form.fornecedor.trim() || null` no POST. Verificar: modal exibe campo Fornecedor; salvar com valor preenche o banco; salvar sem valor não gera erro.
- [x] 2.2 Em `frontend/src/components/EditProductModal.jsx`, adicionar `fornecedor` ao estado do form (inicializado com `product.fornecedor || ''`), exibir campo opcional no formulário e enviar no PUT. Verificar: abrir edição de produto com fornecedor pré-preenche o campo; salvar atualiza o valor.

## 3. Frontend — Coluna fornecedor nas tabelas

- [x] 3.1 Em `Dashboard.jsx` função `renderTabelaProdutos`, adicionar `<th>` "Fornecedor" após "Categoria" e `<td>` com `{p.fornecedor || '—'}`. Verificar: aba Produtos e visão geral do Início exibem a coluna Fornecedor com o valor ou "—".
- [x] 3.2 Em `Dashboard.jsx` função `renderCategorias`, adicionar `<th>` "Fornecedor" e `<td>` correspondente nas tabelas internas de cada categoria. Verificar: aba Categorias exibe coluna Fornecedor em cada grupo.

## 4. Frontend — View de produtos esgotados

- [x] 4.1 Em `Dashboard.jsx`, tornar o card "Sem Estoque" clicável adicionando `onClick={() => setActiveNav('sem-estoque')}` e `cursor-pointer` ao elemento. Verificar: clicar no card muda a view para a lista de esgotados.
- [x] 4.2 Em `Dashboard.jsx`, criar função `renderSemEstoque()` que filtra `products` por `quantidade === 0` ou `parseFloat(p.quantidade) === 0`, ordena por categoria e renderiza uma tabela com colunas Nome e Categoria (exibindo "Sem Categoria" quando `p.categoria` for nulo). Incluir cabeçalho com contagem total de esgotados e mensagem de vazio quando não há itens. Verificar: com produtos esgotados, a view lista todos corretamente; sem esgotados, exibe mensagem informativa.
- [x] 4.3 Em `Dashboard.jsx`, adicionar o branch `{activeNav === 'sem-estoque' && renderSemEstoque()}` no bloco de renderização do `<main>`. Verificar: navegação funciona em todos os casos — card clicável entra na view, sidebar sai dela.

## 5. Validação end-to-end

- [x] 5.1 Cadastrar produto com fornecedor → confirmar aparece na aba Produtos, Categorias e visão geral. Zerar estoque desse produto → confirmar aparece na view de sem estoque com categoria correta.
- [x] 5.2 Editar produto sem fornecedor → adicionar fornecedor → confirmar atualização nas tabelas. Verificar que produtos existentes sem fornecedor exibem "—".
