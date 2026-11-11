# Spec Delta

## ADDED Requirements

### Requirement: Product API functions
The module SHALL export `listProducts()`, `lookupBarcode(codigo)`, `createProduct(data)`, `deleteProduct(id)`, `withdrawProduct(id, quantidade)`, and `entryProduct(id, quantidade)`. The module SHALL NOT export functions to archive a product, restore a product, or list archived products.

#### Scenario: Withdraw product
- **WHEN** `withdrawProduct(5, 3)` is called
- **THEN** a POST request is made to `/api/products/5/withdraw` with body `{ quantidade: 3 }`

#### Scenario: Archive helpers are gone
- **WHEN** the module's exports are inspected
- **THEN** there is no `listArchivedProducts`, `archiveProduct` or `restoreProduct`

## REMOVED Requirements

### Requirement: Product functions
**Reason**: The interface no longer archives, restores or lists archived products, so the three client functions for those calls are deleted. The requirement is replaced by "Product API functions".
**Migration**: See the requirement "Product API functions" in this same spec. The server routes still exist but the client does not call them.
