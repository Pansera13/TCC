require('dotenv').config();
const pool = require('./db');

const produtos = [
  // Grãos
  { nome: 'Arroz Tipo 1',        quantidade: 50, unidade: 'KG', categoria: 'Grãos' },
  { nome: 'Feijão Carioca',      quantidade: 30, unidade: 'KG', categoria: 'Grãos' },
  { nome: 'Lentilha',            quantidade: 12, unidade: 'KG', categoria: 'Grãos' },
  { nome: 'Grão-de-bico',        quantidade: 10, unidade: 'KG', categoria: 'Grãos' },
  // Laticínios
  { nome: 'Leite Integral',      quantidade: 60, unidade: 'L',  categoria: 'Laticínios' },
  { nome: 'Queijo Mussarela',    quantidade: 18, unidade: 'KG', categoria: 'Laticínios' },
  { nome: 'Manteiga',            quantidade: 15, unidade: 'KG', categoria: 'Laticínios' },
  { nome: 'Iogurte Natural',     quantidade: 36, unidade: 'UN', categoria: 'Laticínios' },
  // Bebidas
  { nome: 'Café Torrado',        quantidade: 8,  unidade: 'KG', categoria: 'Bebidas' },
  { nome: 'Suco de Laranja',     quantidade: 40, unidade: 'L',  categoria: 'Bebidas' },
  { nome: 'Água Mineral 500ml',  quantidade: 120, unidade: 'UN', categoria: 'Bebidas' },
  { nome: 'Refrigerante Cola 2L', quantidade: 48, unidade: 'UN', categoria: 'Bebidas' },
  // Limpeza
  { nome: 'Detergente Neutro',   quantidade: 50, unidade: 'UN', categoria: 'Limpeza' },
  { nome: 'Água Sanitária',      quantidade: 25, unidade: 'L',  categoria: 'Limpeza' },
  { nome: 'Sabão em Pó',         quantidade: 20, unidade: 'KG', categoria: 'Limpeza' },
  { nome: 'Desinfetante',        quantidade: 30, unidade: 'L',  categoria: 'Limpeza' },
  // Hortifruti
  { nome: 'Tomate',              quantidade: 25, unidade: 'KG', categoria: 'Hortifruti' },
  { nome: 'Batata',              quantidade: 40, unidade: 'KG', categoria: 'Hortifruti' },
  { nome: 'Cebola',              quantidade: 30, unidade: 'KG', categoria: 'Hortifruti' },
  { nome: 'Banana Prata',        quantidade: 22, unidade: 'KG', categoria: 'Hortifruti' },
];

async function seed() {
  let inseridos = 0;
  for (const p of produtos) {
    const [existe] = await pool.execute('SELECT id FROM products WHERE nome = ?', [p.nome]);
    if (existe.length) {
      console.log(`- ${p.nome} (já existe, ignorado)`);
      continue;
    }
    await pool.execute(
      'INSERT INTO products (nome, quantidade, unidade, categoria) VALUES (?, ?, ?, ?)',
      [p.nome, p.quantidade, p.unidade, p.categoria]
    );
    inseridos++;
    console.log(`✓ ${p.nome} [${p.categoria}]`);
  }
  console.log(`\n${inseridos} produtos inseridos (5 categorias).`);
  process.exit(0);
}

seed().catch(err => { console.error(err.message); process.exit(1); });
