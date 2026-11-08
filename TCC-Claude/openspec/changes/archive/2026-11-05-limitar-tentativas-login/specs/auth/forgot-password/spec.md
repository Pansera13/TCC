# Spec Delta

## MODIFIED Requirements

### Requirement: Limites e privacidade da recuperação

A busca revela dados mascarados da conta, o que expõe a existência de contas; por isso o sistema DEVE limitar buscas e envios por conta e por IP e responder HTTP 429 quando o limite for excedido. Os contadores DEVEM usar janela fixa (sem reinício a cada falha) e o campo `retry_after` da resposta 429 DEVE refletir os segundos reais restantes do bloqueio, calculados a partir do timestamp de expiração armazenado no cache. A redefinição pelo administrador para contas de equipe está fora do escopo desta recuperação.

#### Scenario: Excesso de buscas pelo mesmo IP

- **WHEN** um mesmo IP excede o limite de buscas em uma janela de tempo
- **THEN** o sistema responde HTTP 429 com mensagem pedindo para tentar mais tarde

#### Scenario: Excesso de envios para a mesma conta

- **WHEN** são pedidos mais códigos para a mesma conta do que o limite por janela de tempo
- **THEN** o sistema responde HTTP 429 com `retry_after` refletindo os segundos reais restantes e não envia o e-mail

#### Scenario: retry_after correto após bloqueio por envios

- **WHEN** o limite de envios para a conta é excedido e o cliente consulta o `retry_after`
- **THEN** o valor retornado é os segundos reais até o desbloqueio, não um valor fixo calculado incorretamente via `cache.ttl`

#### Scenario: Janela fixa não reinicia a cada tentativa

- **WHEN** o cliente faz múltiplas tentativas de envio espaçadas dentro da janela
- **THEN** a janela de contagem não é reiniciada pelas tentativas subsequentes; o bloqueio ocorre quando o total acumulado na janela original atingir o limite
