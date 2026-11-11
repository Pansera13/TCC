# Spec Delta

## MODIFIED Requirements

### Requirement: Empty states
When no products match the search the component SHALL show "Nenhum produto encontrado para "{search}".". When there are no products at all a "Nenhum produto cadastrado ainda." message with "+ Adicionar primeiro produto" SHALL be shown. When products exist but every one of them is out of stock, the component SHALL show "Todos os produtos estão sem estoque. Veja a aba Sem estoque." instead of the "no products registered" message.

#### Scenario: No products found for search
- **WHEN** the search term matches no product names
- **THEN** the empty-state message is shown instead of product cards

#### Scenario: Every product is out of stock
- **WHEN** the tenant has products but all of them have quantity zero
- **THEN** the Produtos tab shows "Todos os produtos estão sem estoque. Veja a aba Sem estoque." and not "Nenhum produto cadastrado ainda."
