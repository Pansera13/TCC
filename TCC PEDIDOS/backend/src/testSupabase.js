require('dotenv').config();
const supabase = require('./supabase');

async function main() {
  const { error: e1 } = await supabase.from('products').select('id').limit(1);
  if (e1) { console.error('ERRO: products -', e1.message); process.exit(1); }
  console.log('OK: products');

  const { error: e2 } = await supabase.from('pedidos').select('id').limit(1);
  if (e2) { console.error('ERRO: pedidos -', e2.message); process.exit(1); }
  console.log('OK: pedidos');
}

main().catch(err => { console.error(err.message); process.exit(1); });
