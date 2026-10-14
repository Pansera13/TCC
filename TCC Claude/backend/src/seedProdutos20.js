require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const produtos = [
  { nome: 'Coca-Cola 2L',                  categoria: 'Refrigerantes',      quantidade: 120, unidade: 'UN', peso_kg: 2.000, fornecedor: 'Coca-Cola FEMSA' },
  { nome: 'Guaraná Antarctica 2L',          categoria: 'Refrigerantes',      quantidade: 90,  unidade: 'UN', peso_kg: 2.000, fornecedor: 'Ambev' },
  { nome: 'Suco de Laranja Del Valle 1L',   categoria: 'Sucos',              quantidade: 60,  unidade: 'UN', peso_kg: 1.000, fornecedor: 'Del Valle' },
  { nome: 'Água Mineral Crystal 500ml',     categoria: 'Águas',              quantidade: 200, unidade: 'UN', peso_kg: 0.500, fornecedor: 'Crystal' },
  { nome: 'Cerveja Skol Lata 350ml',        categoria: 'Cervejas',           quantidade: 240, unidade: 'UN', peso_kg: 0.350, fornecedor: 'Ambev' },
  { nome: 'Leite Integral Piracanjuba 1L',  categoria: 'Laticínios',         quantidade: 150, unidade: 'UN', peso_kg: 1.000, fornecedor: 'Piracanjuba' },
  { nome: 'Queijo Mussarela Fatiado',       categoria: 'Laticínios',         quantidade: 25,  unidade: 'KG', peso_kg: 1.000, fornecedor: 'Tirolez' },
  { nome: 'Iogurte Natural Nestlé 170g',    categoria: 'Laticínios',         quantidade: 80,  unidade: 'UN', peso_kg: 0.170, fornecedor: 'Nestlé' },
  { nome: 'Arroz Branco Tio João 5kg',      categoria: 'Carboidratos',       quantidade: 70,  unidade: 'UN', peso_kg: 5.000, fornecedor: 'Tio João' },
  { nome: 'Macarrão Espaguete Barilla 500g',categoria: 'Carboidratos',       quantidade: 110, unidade: 'UN', peso_kg: 0.500, fornecedor: 'Barilla' },
  { nome: 'Pão de Forma Pullman 500g',      categoria: 'Padaria',            quantidade: 45,  unidade: 'UN', peso_kg: 0.500, fornecedor: 'Bimbo' },
  { nome: 'Farinha de Trigo Dona Benta 1kg',categoria: 'Carboidratos',       quantidade: 85,  unidade: 'UN', peso_kg: 1.000, fornecedor: 'Dona Benta' },
  { nome: 'Feijão Carioca Camil 1kg',       categoria: 'Grãos',              quantidade: 95,  unidade: 'UN', peso_kg: 1.000, fornecedor: 'Camil' },
  { nome: 'Peito de Frango Congelado',      categoria: 'Carnes',             quantidade: 40,  unidade: 'KG', peso_kg: 1.000, fornecedor: 'Sadia' },
  { nome: 'Carne Moída Bovina',             categoria: 'Carnes',             quantidade: 30,  unidade: 'KG', peso_kg: 1.000, fornecedor: 'Friboi' },
  { nome: 'Banana Prata',                   categoria: 'Hortifruti',         quantidade: 35,  unidade: 'KG', peso_kg: 1.000, fornecedor: 'CEASA' },
  { nome: 'Tomate Italiano',                categoria: 'Hortifruti',         quantidade: 28,  unidade: 'KG', peso_kg: 1.000, fornecedor: 'CEASA' },
  { nome: 'Biscoito Recheado Oreo 90g',     categoria: 'Biscoitos e Snacks', quantidade: 130, unidade: 'UN', peso_kg: 0.090, fornecedor: 'Mondelez' },
  { nome: 'Chocolate Barra Lacta 80g',      categoria: 'Doces',              quantidade: 100, unidade: 'UN', peso_kg: 0.080, fornecedor: 'Mondelez' },
  { nome: 'Azeite de Oliva Gallo 500ml',    categoria: 'Mercearia',          quantidade: 50,  unidade: 'UN', peso_kg: 0.500, fornecedor: 'Gallo' },
];

async function seed() {
  const client = await pool.connect();
  let inseridos = 0;
  let ignorados = 0;
  const porCategoria = {};

  try {
    await client.query('BEGIN');

    for (const p of produtos) {
      const { rows } = await client.query(
        'SELECT id FROM products WHERE LOWER(nome) = LOWER($1)',
        [p.nome]
      );

      if (rows.length) {
        ignorados++;
        console.log(`- ${p.nome} (já existe, ignorado)`);
        continue;
      }

      const ins = await client.query(
        `INSERT INTO products (nome, quantidade, unidade, peso_kg, categoria, fornecedor)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [p.nome, p.quantidade, p.unidade, p.peso_kg, p.categoria, p.fornecedor]
      );
      const productId = ins.rows[0].id;

      await client.query(
        `INSERT INTO movements (product_id, product_nome, tipo, quantidade, user_id, user_nome, origem)
         VALUES ($1, $2, 'entrada', $3, NULL, 'Seed', 'estoque')`,
        [productId, p.nome, p.quantidade]
      );

      inseridos++;
      porCategoria[p.categoria] = (porCategoria[p.categoria] || 0) + 1;
      console.log(`✓ ${p.nome} [${p.categoria}]`);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  console.log(`\n${inseridos} inseridos, ${ignorados} ignorados.`);
  if (inseridos > 0) {
    console.log('\nPor categoria:');
    for (const [cat, count] of Object.entries(porCategoria).sort()) {
      console.log(`  ${cat}: ${count}`);
    }
  }
}

seed()
  .then(() => process.exit(0))
  .catch(err => { console.error('Erro:', err.message); process.exit(1); });
