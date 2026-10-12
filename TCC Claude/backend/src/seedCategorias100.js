require('dotenv').config();
const pool = require('./db');

// [nome, quantidade, unidade]
const catalogo = {
  'Alimentos': [
    ['Farinha de Trigo', 20, 'KG'], ['Açúcar Refinado', 15, 'KG'], ['Sal Refinado', 10, 'KG'],
    ['Óleo de Soja', 24, 'L'], ['Macarrão Espaguete', 40, 'UN'], ['Molho de Tomate', 60, 'UN'],
    ['Milho Verde em Lata', 45, 'UN'], ['Sardinha em Lata', 36, 'UN'], ['Atum em Lata', 30, 'UN'],
    ['Biscoito Cream Cracker', 50, 'UN'], ['Biscoito Recheado', 55, 'UN'], ['Aveia em Flocos', 14, 'KG'],
    ['Fubá', 18, 'KG'], ['Maionese', 28, 'UN'], ['Ketchup', 26, 'UN'],
    ['Chocolate em Pó', 12, 'KG'], ['Leite Condensado', 40, 'UN'], ['Creme de Leite', 42, 'UN'],
    ['Azeite de Oliva', 16, 'L'], ['Vinagre', 20, 'L'],
  ],
  'Bebidas Diversas': [
    ['Água Mineral 1,5L', 100, 'UN'], ['Água com Gás 500ml', 60, 'UN'], ['Refrigerante Guaraná 2L', 48, 'UN'],
    ['Refrigerante Limão 2L', 36, 'UN'], ['Suco de Uva Integral', 30, 'L'], ['Suco de Maçã', 28, 'L'],
    ['Cerveja Pilsen Lata', 120, 'UN'], ['Cerveja Long Neck', 96, 'UN'], ['Vinho Tinto Suave', 24, 'UN'],
    ['Vinho Branco Seco', 18, 'UN'], ['Energético 250ml', 72, 'UN'], ['Isotônico Laranja', 40, 'UN'],
    ['Chá Gelado Limão', 44, 'UN'], ['Chá Mate', 35, 'UN'], ['Leite de Coco', 22, 'L'],
    ['Água de Coco', 32, 'L'], ['Achocolatado Pronto', 50, 'UN'], ['Café Solúvel', 15, 'UN'],
    ['Cappuccino em Pó', 14, 'UN'], ['Xarope de Groselha', 12, 'L'],
  ],
  'Peças Eletrônicas': [
    ['Resistor 1k Ohm', 500, 'UN'], ['Resistor 10k Ohm', 500, 'UN'], ['Capacitor 100uF', 300, 'UN'],
    ['Capacitor Cerâmico 100nF', 400, 'UN'], ['LED Vermelho 5mm', 600, 'UN'], ['LED Verde 5mm', 600, 'UN'],
    ['Diodo 1N4007', 350, 'UN'], ['Transistor BC547', 250, 'UN'], ['Transistor TIP120', 120, 'UN'],
    ['Regulador 7805', 150, 'UN'], ['Arduino Uno', 25, 'UN'], ['ESP32 DevKit', 30, 'UN'],
    ['Protoboard 830 Pontos', 40, 'UN'], ['Jumper Macho-Macho', 200, 'UN'], ['Sensor Ultrassônico HC-SR04', 45, 'UN'],
    ['Sensor de Temperatura DHT11', 38, 'UN'], ['Display LCD 16x2', 22, 'UN'], ['Servo Motor SG90', 35, 'UN'],
    ['Módulo Relé 5V', 28, 'UN'], ['Buzzer 5V', 80, 'UN'],
  ],
  'Ferramentas': [
    ['Martelo de Unha', 15, 'UN'], ['Chave de Fenda 1/4', 30, 'UN'], ['Chave Phillips 1/4', 30, 'UN'],
    ['Alicate Universal', 20, 'UN'], ['Alicate de Corte', 18, 'UN'], ['Chave Inglesa 10"', 12, 'UN'],
    ['Jogo de Chaves Allen', 14, 'UN'], ['Trena 5m', 25, 'UN'], ['Nível de Bolha', 10, 'UN'],
    ['Serrote 20"', 9, 'UN'], ['Furadeira de Impacto', 6, 'UN'], ['Broca de Aço 6mm', 60, 'UN'],
    ['Parafuso Sextavado M8', 400, 'UN'], ['Porca M8', 400, 'UN'], ['Arruela Lisa M8', 450, 'UN'],
    ['Fita Isolante', 70, 'UN'], ['Fita Veda Rosca', 65, 'UN'], ['Lixa para Madeira', 100, 'UN'],
    ['Luva de Proteção', 45, 'UN'], ['Óculos de Proteção', 32, 'UN'],
  ],
  'Papelaria': [
    ['Caneta Esferográfica Azul', 200, 'UN'], ['Caneta Esferográfica Preta', 200, 'UN'], ['Lápis Preto HB', 250, 'UN'],
    ['Borracha Branca', 150, 'UN'], ['Apontador', 120, 'UN'], ['Caderno 96 Folhas', 80, 'UN'],
    ['Caderno Universitário 10 Matérias', 50, 'UN'], ['Resma de Papel A4', 40, 'UN'], ['Pasta Suspensa', 90, 'UN'],
    ['Grampeador', 25, 'UN'], ['Grampos 26/6', 60, 'UN'], ['Clipes Nº 2', 100, 'UN'],
    ['Cola Branca 90g', 70, 'UN'], ['Tesoura Escolar', 45, 'UN'], ['Régua 30cm', 85, 'UN'],
    ['Marca-Texto Amarelo', 110, 'UN'], ['Pincel Atômico Preto', 75, 'UN'], ['Post-it 76x76', 95, 'UN'],
    ['Envelope Ofício', 300, 'UN'], ['Fita Adesiva Transparente', 65, 'UN'],
  ],
};

async function seed() {
  let inseridos = 0, ignorados = 0;
  for (const [categoria, itens] of Object.entries(catalogo)) {
    for (const [nome, quantidade, unidade] of itens) {
      const [existe] = await pool.execute('SELECT id FROM products WHERE nome = ?', [nome]);
      if (existe.length) { ignorados++; console.log(`- ${nome} (já existe, ignorado)`); continue; }
      await pool.execute(
        'INSERT INTO products (nome, quantidade, unidade, categoria) VALUES (?, ?, ?, ?)',
        [nome, quantidade, unidade, categoria]
      );
      inseridos++;
    }
    console.log(`✓ ${categoria}`);
  }
  console.log(`\n${inseridos} produtos inseridos, ${ignorados} ignorados.`);
  process.exit(0);
}

seed().catch(err => { console.error(err.message); process.exit(1); });
