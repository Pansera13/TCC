## 1. Fundação do projeto

- [x] 1.1 Inicializar monorepo/estrutura (`frontend/` React+TS, `backend/` Node+TS) e verificar que `npm install` e o build de cada pacote concluem sem erro
- [x] 1.2 Configurar lint, formatação e scripts de dev/build; verificar que `lint` e `build` rodam limpos em ambos os pacotes
- [ ] 1.3 Servir o site pela rede em desenvolvimento (host `0.0.0.0`) com HTTPS/contexto seguro (ex.: mkcert ou túnel HTTPS); verificar abrindo a URL no computador e em um celular na mesma rede, com a câmera funcionando _(código pronto: HOST 0.0.0.0, suporte a TLS no server, Vite host 0.0.0.0; boot verificado. Falta verificação física no celular com câmera — ver README.)_
- [x] 1.4 Provisionar banco (PostgreSQL; SQLite para dev) e ORM, criar conexão e verificar com uma migração vazia aplicada com sucesso

## 2. Modelo de dados e migrações

- [x] 2.1 Definir schema `users` e migração; verificar que a migração aplica e reverte sem erro
- [x] 2.2 Definir schema `products` (com `description_normalized`, `gtin`, `unit`) e índice por `user_id`+`gtin`; verificar aplicação da migração
- [x] 2.3 Definir schema `stock_movements` e saldo por produto; verificar aplicação da migração
- [x] 2.4 Definir schema `imported_notes` (com `access_key` único por usuário) e `imported_note_items`; verificar unicidade via teste de inserção duplicada

## 3. Autenticação e isolamento por conta (capability: user-auth)

- [x] 3.1 Implementar cadastro com hash de senha (argon2/bcrypt) e política mínima (≥8 chars); verificar com testes dos cenários de cadastro bem-sucedido, e-mail duplicado e senha fraca
- [x] 3.2 Implementar login/logout com sessão (cookie httpOnly ou JWT curto) e expiração por inatividade; verificar com testes de credenciais válidas, inválidas e logout
- [x] 3.3 Implementar middleware de autorização que filtra todo recurso por `user_id`; verificar com teste de que um usuário não acessa recurso de outra conta
- [x] 3.4 Criar tela de login no PWA com campo de login (e-mail), campo de senha, botão de entrar e botão pequeno de cadastro; verificar composição e que o botão de cadastro abre a tela de criação de conta
- [x] 3.5 Criar tela de cadastro no PWA e ligar ao fluxo de login/logout; verificar fluxo manual de registrar, entrar e sair

## 4. Estoque e catálogo (capability: inventory)

- [x] 4.1 Implementar CRUD de produtos e cálculo/consulta de saldo; verificar com teste de que saldo = entradas − saídas − ajustes
- [x] 4.2 Implementar registro de movimentações (entrada/saída/ajuste com origem); verificar com teste que histórico lista movimentações em ordem cronológica
- [x] 4.3 Implementar regra de saída que impede saldo negativo; verificar com teste do cenário "saída maior que o saldo" (operação rejeitada, saldo inalterado)
- [x] 4.4 Implementar correspondência automática por GTIN e fallback por descrição normalizada, criando produto quando não há equivalente; verificar com testes dos cenários de item correspondente e item sem correspondência
- [x] 4.5 Implementar ajuste manual de saldo e edição de produto; verificar com testes de ajuste (gera movimentação de diferença) e de edição refletida na correspondência
- [x] 4.6 Criar telas de catálogo, saldo, histórico e ajuste manual no PWA; verificar fluxo manual ponta a ponta

## 5. Obtenção dos dados da NFC-e (capability: nfe-import — backend)

- [x] 5.1 Definir interface `NotaFiscalProvider` (entrada: chave de acesso; saída: itens com descrição/GTIN/quantidade/unidade/valor); verificar com teste usando um provider fake
- [x] 5.2 Implementar validação da chave de acesso de 44 dígitos; verificar com testes de chave válida e inválida
- [x] 5.3 Implementar `SefazHtmlProvider` para o(s) estado(s)-alvo do MVP (parsing da página pública de consulta); verificar com teste sobre HTML de exemplo salvo (fixture) extraindo os itens corretos
- [x] 5.4 Implementar `XmlProvider` (upload de XML) reaproveitando o parser de itens; verificar com teste sobre XML de exemplo
- [x] 5.5 Tratar falhas da fonte (nota não localizada, indisponibilidade, dados incompletos) sem alterar estoque; verificar com teste do cenário de falha

## 6. Fluxo de importação (capability: nfe-import — aplicação)

- [x] 6.1 Endpoint de importação: recebe chave/XML, chama o provider e retorna itens extraídos para revisão (sem efetivar); verificar com teste de integração
- [x] 6.2 Endpoint de confirmação: efetiva entradas de estoque via capability inventory e registra a nota; verificar com teste que o saldo dos produtos aumenta conforme a nota
- [x] 6.3 Implementar idempotência por chave de acesso (bloqueio de reimportação por conta); verificar com teste do cenário "nota já importada"
- [x] 6.4 Implementar rastreabilidade (movimentação aponta para a nota de origem); verificar com teste do cenário de rastreabilidade
- [x] 6.5 Implementar caminho de entrada manual (adicionar/editar/completar/remover itens) na tela de revisão, disponível tanto quando a SEFAZ falha quanto para complementar nota parcial; verificar com testes dos cenários "fonte indisponível", "entrada manual de itens" e "complemento de nota parcial"
- [x] 6.6 Criar tela de revisão/confirmação/cancelamento no PWA (convergindo SEFAZ, XML e manual no mesmo fluxo); verificar cenários de confirmação e de cancelamento (sem alterar estoque)

## 7. Leitura por câmera (capability: nfe-scanning — frontend)

- [ ] 7.1 Implementar componente de câmera com `getUserMedia`, preferência por câmera traseira e alternância entre câmeras; verificar preview em celular e desktop _(componente `CameraScanner` implementado e compila; verificação de preview exige câmera física.)_
- [ ] 7.2 Integrar decodificação (`BarcodeDetector` com fallback ZXing/html5-qrcode) para QR e EAN/GTIN; verificar leitura de um QR de NFC-e e de um código de barras de teste _(integração `@zxing/browser` implementada e compila; leitura real exige câmera física.)_
- [x] 7.3 Extrair e validar a chave de acesso do QR da NFC-e e encaminhar para importação; verificar com QR válido e com código não-NFC-e (mantém captura ativa)
- [ ] 7.4 Tratar permissão negada/ausência de câmera com fallback de entrada manual de chave/GTIN; verificar ambos os cenários _(fallback implementado — `onUnavailable` troca para entrada manual; verificação do cenário de permissão negada exige dispositivo.)_
- [x] 7.5 Ligar leitura de GTIN à correspondência do catálogo (localizar/cadastrar produto); verificar fluxo manual

## 8. PWA e responsividade

- [x] 8.1 Adicionar manifest e ícones; verificar que o app é instalável em celular e desktop
- [x] 8.2 Adicionar service worker (shell offline básico); verificar carregamento do shell offline via DevTools
- [x] 8.3 Ajustar layout responsivo das telas principais; verificar uso em viewport de celular e desktop

## 9. Integração e verificação final

- [x] 9.1 Teste ponta a ponta: cadastrar/logar → escanear QR de NFC-e (fixture) → revisar → confirmar → conferir saldos e histórico; verificar cenário completo
- [x] 9.2 Teste ponta a ponta de reimportação bloqueada e de fallback por XML/entrada manual; verificar comportamento esperado
- [x] 9.3 Executar `openspec validate add-nfe-inventory-system --strict` e a suíte de testes; verificar que ambos passam
- [x] 9.4 Escrever README de execução (setup, HTTPS, banco, provider do estado, como acessar a URL pelo celular na rede); verificar seguindo o passo a passo em ambiente limpo
- [ ] 9.5 Publicar o site em um host acessível por URL (frontend estático + backend/API + banco) e verificar acesso externo, login e um fluxo de importação de ponta a ponta _(procedimento documentado no README; o deploy real depende da conta/host do usuário.)_
