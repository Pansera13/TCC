require('dotenv').config();
const pool = require('./db');

const produtos = [
  { nome: 'Arroz Tipo 1',       quantidade: 50,  unidade: 'KG', categoria: 'Grãos' },
  { nome: 'Feijão Carioca',     quantidade: 30,  unidade: 'KG', categoria: 'Grãos' },
  { nome: 'Óleo de Soja',       quantidade: 24,  unidade: 'L',  categoria: 'Óleos' },
  { nome: 'Farinha de Trigo',   quantidade: 20,  unidade: 'KG', categoria: 'Farinhas' },
  { nome: 'Açúcar Refinado',    quantidade: 15,  unidade: 'KG', categoria: 'Açúcar' },
  { nome: 'Macarrão Espaguete', quantidade: 40,  unidade: 'UN', categoria: 'Massas' },
  { nome: 'Sal Refinado',       quantidade: 10,  unidade: 'KG', categoria: 'Temperos' },
  { nome: 'Café Torrado',       quantidade: 8,   unidade: 'KG', categoria: 'Bebidas' },
];

async function seed() {
  for (const p of produtos) {
    await pool.execute(
      'INSERT INTO products (nome, quantidade, unidade, categoria) VALUES (?, ?, ?, ?)',
      [p.nome, p.quantidade, p.unidade, p.categoria]
    );
    console.log(`✓ ${p.nome}`);
  }
  console.log('\nProdutos de teste inseridos com sucesso!');
  process.exit(0);
}

seed().catch(err => { console.error(err.message); process.exit(1); });
