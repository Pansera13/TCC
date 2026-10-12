# Tasks

## 1. Setup de dependências

- [x] 1.1 Instalar `html5-qrcode` no frontend (`npm install html5-qrcode`) e verificar que `package.json` lista a dependência e `npm run build` conclui sem erro
- [x] 1.2 Instalar `xml2js` no backend (`npm install xml2js`) e verificar que `package.json` do backend lista a dependência

## 2. Fix do botão "Sair" no header

- [x] 2.1 Adicionar `shrink-0` ao `div` que envolve os botões do lado direito do header em `Dashboard.jsx` (linha ~83) e verificar visualmente que o botão "Sair" não fica cortado ao redimensionar a janela para larguras menores (ex.: 768px)

## 3. Modal de adição de produto — estrutura base

- [x] 3.1 Criar `frontend/src/components/AddProductModal.jsx` com estado `isOpen`, props `onClose` e dois botões de seleção de modo ("Manual" / "Câmera"), verificar que o componente renderiza sem erros
- [x] 3.2 Conectar o botão "+ Novo produto" em `Dashboard.jsx` ao estado `showModal` que controla a exibição de `AddProductModal`, verificar que clicar no botão abre o modal e clicar em X / Cancelar / fora do modal fecha sem erros
- [x] 3.3 Implementar comportamento de fechamento por tecla Escape no modal e verificar que pressionar Escape fecha o modal sem adicionar produto

## 4. Formulário de cadastro manual

- [x] 4.1 Implementar no modo Manual: campos nome (obrigatório), quantidade (obrigatório, numérico > 0), unidade de medida (obrigatório, select com UN/KG/L/CX), peso kg (opcional), categoria (opcional), verificar que todos os campos aparecem corretamente
- [x] 4.2 Implementar validação de campos obrigatórios: ao clicar em "Salvar" com campo vazio ou quantidade inválida, exibir mensagem de erro inline no campo correspondente e não fechar o modal
- [x] 4.3 Ao submeter o formulário válido, chamar `POST /api/products` com os dados e verificar que o modal fecha após resposta de sucesso (200/201) do backend

## 5. Scanner NF-e via câmera

- [x] 5.1 Implementar o modo Câmera: ao selecionar "Câmera", iniciar `Html5QrcodeScanner` de `html5-qrcode` apontando para um `div` dedicado no modal, verificar que o preview da câmera aparece (testar em `localhost`)
- [x] 5.2 Implementar callback `onScanSuccess`: ao detectar QR code ou código de barras, extrair a chave de acesso / URL da NF-e, parar a câmera e chamar `GET /api/nfe/:chave` no backend, verificar que a câmera para após leitura bem-sucedida
- [x] 5.3 Implementar tela de confirmação: após retorno bem-sucedido do backend, listar produtos (nome, quantidade, unidade) e exibir botões "Confirmar e Adicionar" e "Cancelar", verificar que a lista corresponde ao retorno do backend
- [x] 5.4 Ao clicar "Confirmar e Adicionar", chamar `POST /api/products` para cada produto da lista e fechar o modal após todos serem salvos, verificar que os produtos aparecem na listagem do Dashboard
- [x] 5.5 Implementar tratamento de erros da câmera (permissão negada → mensagem + botão "Usar modo Manual") e de scan (timeout 30s → mensagem + opção de tentar novamente), verificar mensagens exibidas ao simular cada caso

## 6. Backend — endpoint de produtos

- [x] 6.1 Criar tabela `products` no banco de dados (via script SQL ou migration): campos `id`, `nome`, `quantidade`, `unidade`, `peso_kg`, `categoria`, `created_at`, verificar que a tabela existe com `DESCRIBE products`
- [x] 6.2 Criar `backend/src/controllers/productController.js` com função `createProduct` que valida body e insere na tabela `products`, verificar com `curl -X POST /api/products` com payload válido retornando 201
- [x] 6.3 Criar rota `POST /api/products` protegida por middleware JWT em `backend/src/routes/products.js` e registrar no `server.js`, verificar que sem token retorna 401 e com token retorna 201

## 7. Backend — proxy de consulta NF-e

- [x] 7.1 Criar função `queryNfe(chave)` em `backend/src/services/nfeService.js` que chama o webservice SEFAZ NF-e (endpoint público de consulta de nota por chave de acesso) e parseia o XML de retorno com `xml2js`, extraindo a lista de produtos (`det > prod`), verificar com chave de acesso válida de teste
- [x] 7.2 Criar rota `GET /api/nfe/:chave` em `backend/src/routes/nfe.js` protegida por JWT, que delega para `queryNfe` e retorna JSON com array de produtos `[{nome, quantidade, unidade}]`, verificar retorno 200 com payload correto e 404 para chave inválida
- [x] 7.3 Registrar a rota `/api/nfe` no `server.js` e verificar que `GET /api/nfe/chave-invalida` retorna JSON de erro sem quebrar o servidor

## 8. Integração final e validação

- [x] 8.1 Testar fluxo completo Manual: abrir modal → preencher formulário → salvar → verificar produto aparece na lista do Dashboard (requer atualização da listagem no `Dashboard.jsx`)
- [x] 8.2 Testar fluxo completo Câmera: abrir modal → escanear QR code ou código de barras de NF-e → ver lista de confirmação → confirmar → verificar produtos adicionados
- [x] 8.3 Verificar que o botão "Sair" é visível em resolução 768px, 1024px e 1440px sem overflow
