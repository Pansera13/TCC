#!/usr/bin/env node
/**
 * Teste da matriz de permissões — roda contra o servidor real.
 *
 * Uso:
 *   ADMIN_EMAIL=admin@x.com ADMIN_SENHA=senha node test-permissoes.js
 *
 * Variáveis de ambiente:
 *   BASE_URL     URL base do servidor (padrão: http://localhost:3001)
 *   ADMIN_EMAIL  E-mail do Administrador existente no banco
 *   ADMIN_SENHA  Senha do Administrador
 */

'use strict';

const axios = require('axios');

const BASE        = (process.env.BASE_URL ?? 'http://localhost:3001').replace(/\/$/, '');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? '';
const ADMIN_SENHA = process.env.ADMIN_SENHA ?? '';

if (!ADMIN_EMAIL || !ADMIN_SENHA) {
  console.error('\nDefina ADMIN_EMAIL e ADMIN_SENHA antes de rodar.\n');
  console.error('  Exemplo:');
  console.error('  ADMIN_EMAIL=admin@x.com ADMIN_SENHA=senha123 node test-permissoes.js\n');
  process.exit(1);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function client(token) {
  return axios.create({
    baseURL: BASE,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    validateStatus: () => true,
  });
}

async function login(email, senha) {
  const r = await client(null).post('/api/auth/login', { identifier: email, senha });
  if (r.status !== 200) throw new Error(`Login "${email}" falhou: ${r.status} ${JSON.stringify(r.data)}`);
  return r.data.token;
}

let _cpfSeq = 0;
function cpfTeste() {
  const base = String(Date.now() % 99_999_999).padStart(8, '0');
  const seq  = String(++_cpfSeq).padStart(3, '0');
  return `${base.slice(0, 3)}.${base.slice(3, 6)}.${seq}-00`;
}

// ── Período válido para GET /api/reports (últimos 30 dias, MAX_DIAS=366) ──

function periodoPadrao() {
  const fmt = (d) => d.toISOString().slice(0, 10);
  const to   = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  return `from=${fmt(from)}&to=${fmt(to)}`;
}

// ── Coleta de resultados ───────────────────────────────────────────────────

const resultados = [];

function registrar(endpoint, cargo, obtido, esperado) {
  let ok;
  if (typeof esperado === 'string' && esperado.startsWith('!')) {
    ok = obtido !== Number(esperado.slice(1));
  } else {
    ok = obtido === esperado;
  }
  resultados.push({ endpoint, cargo, esperado: String(esperado), obtido: String(obtido), ok });
}

async function testar(endpoint, cargo, fn, esperado) {
  try {
    const r = await fn();
    registrar(endpoint, cargo, r.status, esperado);
    return r;
  } catch (err) {
    const msg = `ERR:${err.code ?? err.message}`;
    registrar(endpoint, cargo, msg, esperado);
    return null;
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const TS = Date.now();

  // 1. Login admin original
  console.log('\n[1/6] Autenticando admin original…');
  const adminToken = await login(ADMIN_EMAIL, ADMIN_SENHA);
  const A = client(adminToken);

  // IDs a limpar no finally
  const produtosExtras = [];
  const usuariosExtras = [];
  let prodId    = null;
  let alvoUserId  = null;
  let alvoSocioId = null;
  let tfUserId  = null;
  let tfSocioId = null;
  let tfAdmId   = null;

  try {
    // 2. Criar contas de teste
    console.log('[2/6] Criando contas de teste…');
    const contas = [
      { chave: 'user',  email: `_tf_user_${TS}@t.local`,   nome: '_TF Funcionario', role: 'user'  },
      { chave: 'socio', email: `_tf_socio_${TS}@t.local`,  nome: '_TF Socio',       role: 'socio' },
      { chave: 'admin', email: `_tf_adm_${TS}@t.local`,    nome: '_TF Admin',       role: 'admin' },
      { chave: 'alvou', email: `_tf_alvou_${TS}@t.local`,  nome: '_TF Alvo User',   role: 'user'  },
      { chave: 'alvos', email: `_tf_alvos_${TS}@t.local`,  nome: '_TF Alvo Socio',  role: 'socio' },
    ];

    const ids = {};
    for (const c of contas) {
      const r = await A.post('/api/users', {
        nome: c.nome, cpf_cnpj: cpfTeste(),
        email: c.email, senha: 'Teste@123', role: c.role,
      });
      if (r.status !== 201) throw new Error(`Criação de ${c.email} falhou: ${r.status} – ${JSON.stringify(r.data)}`);
      ids[c.chave] = r.data.id;
      console.log(`  + ${c.email} (id=${r.data.id}, role=${c.role})`);
    }

    tfUserId    = ids.user;
    tfSocioId   = ids.socio;
    tfAdmId     = ids.admin;
    alvoUserId  = ids.alvou;
    alvoSocioId = ids.alvos;

    // 3. Login nas contas de teste
    console.log('[3/6] Autenticando contas de teste…');
    const U = client(await login(`_tf_user_${TS}@t.local`,  'Teste@123'));
    const S = client(await login(`_tf_socio_${TS}@t.local`, 'Teste@123'));
    const T = client(await login(`_tf_adm_${TS}@t.local`,   'Teste@123'));
    console.log('  Tokens: Funcionario, Socio, Admin-teste');

    // 4. Produto de teste (via admin original)
    console.log('[4/6] Criando produto de teste…');
    const rP = await A.post('/api/products', {
      nome: `_TF Produto ${TS}`, quantidade: 200, unidade: 'UN',
      categoria: 'Teste', fornecedor: 'Teste',
    });
    if (rP.status !== 201) throw new Error(`Produto de teste falhou: ${rP.status}`);
    prodId = rP.data.id;
    console.log(`  Produto id=${prodId}`);

    // 5. Testes
    console.log('[5/6] Executando testes…\n');

    // ── Produtos ──────────────────────────────────────────────────────────

    for (const [label, c] of [['Funcionario', U], ['Socio', S], ['Admin', T]]) {
      await testar('GET  /api/products', label, () => c.get('/api/products'), 200);
    }

    for (const [label, c, exp] of [['Funcionario', U, 403], ['Socio', S, 403], ['Admin', T, 200]]) {
      await testar('GET  /api/products?arquivados=1', label, () => c.get('/api/products?arquivados=1'), exp);
    }

    for (const [label, c, exp] of [['Funcionario', U, 403], ['Socio', S, 201], ['Admin', T, 201]]) {
      const r = await testar('POST /api/products', label, () => c.post('/api/products', {
        nome: `_TF extra_${label}_${TS}`, quantidade: 1, unidade: 'UN',
      }), exp);
      if (r?.status === 201) produtosExtras.push(r.data.id);
    }

    for (const [label, c, exp] of [['Funcionario', U, 403], ['Socio', S, 200], ['Admin', T, 200]]) {
      await testar('PUT  /api/products/:id', label, () => c.put(`/api/products/${prodId}`, {
        nome: `_TF Produto ${TS}`, quantidade: 200, unidade: 'UN',
      }), exp);
    }

    for (const [label, c] of [['Funcionario', U], ['Socio', S], ['Admin', T]]) {
      await testar('POST /api/products/:id/entry',    label, () => c.post(`/api/products/${prodId}/entry`,    { quantidade: 5 }), 200);
      await testar('POST /api/products/:id/withdraw', label, () => c.post(`/api/products/${prodId}/withdraw`, { quantidade: 1 }), 200);
    }

    // Barcode — testa permissão; barcode inexistente → !403 para quem tem acesso
    for (const [label, c, exp] of [['Funcionario', U, 403], ['Socio', S, '!403'], ['Admin', T, '!403']]) {
      await testar('GET  /api/products/barcode/:codigo', label, () => c.get('/api/products/barcode/0000000000000'), exp);
    }

    // Archive / restore — sequência de estados
    await testar('POST /api/products/:id/archive', 'Funcionario', () => U.post(`/api/products/${prodId}/archive`), 403);
    await testar('POST /api/products/:id/archive', 'Socio',       () => S.post(`/api/products/${prodId}/archive`), 200);
    // produto arquivado
    await testar('POST /api/products/:id/restore', 'Funcionario', () => U.post(`/api/products/${prodId}/restore`), 403);
    await testar('POST /api/products/:id/restore', 'Socio',       () => S.post(`/api/products/${prodId}/restore`), 403);
    await testar('POST /api/products/:id/restore', 'Admin',       () => T.post(`/api/products/${prodId}/restore`), 200);
    // produto ativo
    await testar('POST /api/products/:id/archive', 'Admin',       () => T.post(`/api/products/${prodId}/archive`), 200);
    // produto arquivado — restaurar para delete
    await A.post(`/api/products/${prodId}/restore`);

    await testar('DELETE /api/products/:id', 'Funcionario', () => U.delete(`/api/products/${prodId}`), 403);
    await testar('DELETE /api/products/:id', 'Socio',       () => S.delete(`/api/products/${prodId}`), 403);
    await testar('DELETE /api/products/:id', 'Admin',       () => T.delete(`/api/products/${prodId}`), 200);
    prodId = null; // já deletado

    // ── NF-e ──────────────────────────────────────────────────────────────

    for (const [label, c, exp] of [['Funcionario', U, 403], ['Socio', S, 400], ['Admin', T, 400]]) {
      await testar('POST /api/nfe/xml', label, () => c.post('/api/nfe/xml', {}), exp);
    }

    // ── Movimentações ─────────────────────────────────────────────────────

    for (const [label, c] of [['Funcionario', U], ['Socio', S], ['Admin', T]]) {
      await testar('GET  /api/movements',       label, () => c.get('/api/movements'),       200);
      await testar('GET  /api/movements/users', label, () => c.get('/api/movements/users'), 200);
    }

    // ── Relatórios ────────────────────────────────────────────────────────

    const periodo = periodoPadrao();
    for (const [label, c, exp] of [['Funcionario', U, 403], ['Socio', S, 200], ['Admin', T, 200]]) {
      await testar('GET  /api/reports?from=&to=', label, () => c.get(`/api/reports?${periodo}`), exp);
    }
    // Validação de datas: sem parâmetros → 400; from > to → 400 (só quem tem permissão chega lá)
    await testar('GET  /api/reports (sem datas)',  'Socio', () => S.get('/api/reports'), 400);
    await testar('GET  /api/reports (from > to)',  'Socio', () => S.get('/api/reports?from=2026-12-31&to=2026-01-01'), 400);

    // ── Usuários ──────────────────────────────────────────────────────────

    for (const [label, c, exp] of [['Funcionario', U, 403], ['Socio', S, 200], ['Admin', T, 200]]) {
      await testar('GET  /api/users', label, () => c.get('/api/users'), exp);
    }

    // POST /api/users role=user (Socio pode criar, Funcionario não)
    for (const [label, c, exp] of [['Funcionario', U, 403], ['Socio', S, 201], ['Admin', T, 201]]) {
      const r = await testar('POST /api/users (role=user)', label, () => c.post('/api/users', {
        nome: `_TF NovUser ${label}`, cpf_cnpj: cpfTeste(),
        email: `_tf_nu_${label.toLowerCase()}_${TS}@t.local`, senha: 'Teste@123', role: 'user',
      }), exp);
      if (r?.status === 201) usuariosExtras.push(r.data.id);
    }

    // POST /api/users role=socio (só Admin)
    for (const [label, c, exp] of [['Funcionario', U, 403], ['Socio', S, 403], ['Admin', T, 201]]) {
      const r = await testar('POST /api/users (role=socio)', label, () => c.post('/api/users', {
        nome: `_TF NovSocio ${label}`, cpf_cnpj: cpfTeste(),
        email: `_tf_ns_${label.toLowerCase()}_${TS}@t.local`, senha: 'Teste@123', role: 'socio',
      }), exp);
      if (r?.status === 201) usuariosExtras.push(r.data.id);
    }

    // PUT /api/users/:id/role (só Admin)
    for (const [label, c, exp] of [['Funcionario', U, 403], ['Socio', S, 403], ['Admin', T, 200]]) {
      await testar('PUT  /api/users/:id/role', label, () =>
        c.put(`/api/users/${alvoUserId}/role`, { role: 'user' }), exp);
    }

    // PUT /api/users/:id/status — alvo=user (Socio e Admin podem)
    for (const [label, c, exp] of [['Funcionario', U, 403], ['Socio', S, 200], ['Admin', T, 200]]) {
      await testar('PUT  /api/users/:id/status (alvo=user)', label, () =>
        c.put(`/api/users/${alvoUserId}/status`), exp);
    }

    // PUT /api/users/:id/status — alvo=socio (só Admin)
    for (const [label, c, exp] of [['Funcionario', U, 403], ['Socio', S, 403], ['Admin', T, 200]]) {
      await testar('PUT  /api/users/:id/status (alvo=socio)', label, () =>
        c.put(`/api/users/${alvoSocioId}/status`), exp);
    }

    // DELETE /api/users/:id — alvo=user (só Admin)
    for (const [label, c, exp] of [['Funcionario', U, 403], ['Socio', S, 403], ['Admin', T, 200]]) {
      await testar('DELETE /api/users/:id', label, () =>
        c.delete(`/api/users/${alvoUserId}`), exp);
    }
    alvoUserId = null; // já deletado pelo Admin

  } finally {
    // 6. Limpeza
    console.log('\n[6/6] Removendo dados de teste…');

    // Produto (se ainda existir)
    if (prodId) {
      await A.post(`/api/products/${prodId}/restore`).catch(() => {});
      const r = await A.delete(`/api/products/${prodId}`).catch(() => ({ status: 'ERR' }));
      console.log(`  produto id=${prodId}: ${r.status}`);
    }

    // Produtos extras criados nos testes
    for (const id of produtosExtras) {
      const r = await A.delete(`/api/products/${id}`).catch(() => ({ status: 'ERR' }));
      console.log(`  produto extra id=${id}: ${r.status}`);
    }

    // Usuários extras criados nos testes
    for (const id of usuariosExtras) {
      const r = await A.delete(`/api/users/${id}`).catch(() => ({ status: 'ERR' }));
      console.log(`  usuário extra id=${id}: ${r.status}`);
    }

    // alvoSocio
    if (alvoSocioId) {
      const r = await A.delete(`/api/users/${alvoSocioId}`).catch(() => ({ status: 'ERR' }));
      console.log(`  alvoSocio id=${alvoSocioId}: ${r.status}`);
    }

    // alvoUser (se ainda existir)
    if (alvoUserId) {
      const r = await A.delete(`/api/users/${alvoUserId}`).catch(() => ({ status: 'ERR' }));
      console.log(`  alvoUser id=${alvoUserId}: ${r.status}`);
    }

    // Contas de teste principais
    for (const [label, id] of [['Funcionario', tfUserId], ['Socio', tfSocioId], ['Admin', tfAdmId]]) {
      if (!id) continue;
      const r = await A.delete(`/api/users/${id}`).catch(() => ({ status: 'ERR' }));
      console.log(`  _tf ${label} id=${id}: ${r.status}`);
    }
  }

  // ── Relatório final ────────────────────────────────────────────────────────
  printTabela();
}

function printTabela() {
  const cabecalho = ['Endpoint', 'Cargo', 'Esperado', 'Obtido', 'Resultado'];
  const linhas = resultados.map(r => [
    r.endpoint, r.cargo, r.esperado, r.obtido, r.ok ? '✓' : '✗ FALHOU',
  ]);

  const w = cabecalho.map((c, i) => Math.max(c.length, ...linhas.map(l => l[i].length)));
  const row  = cols => '│ ' + cols.map((c, i) => c.padEnd(w[i])).join(' │ ') + ' │';
  const sep  = (a, m, b) => a + w.map(n => '─'.repeat(n + 2)).join(m) + b;

  console.log('\n' + sep('┌', '┬', '┐'));
  console.log(row(cabecalho));
  console.log(sep('├', '┼', '┤'));

  let ultimoEndpoint = '';
  for (const l of linhas) {
    if (l[0] !== ultimoEndpoint) {
      if (ultimoEndpoint) console.log(sep('├', '┼', '┤'));
      ultimoEndpoint = l[0];
    }
    console.log(row(l));
  }
  console.log(sep('└', '┴', '┘'));

  const total  = resultados.length;
  const ok     = resultados.filter(r => r.ok).length;
  const falhou = total - ok;

  if (falhou === 0) {
    console.log(`\n✓ ${ok}/${total} — tudo certo!\n`);
  } else {
    console.log(`\n✗ ${falhou} falha(s) em ${total} testes:\n`);
    resultados.filter(r => !r.ok).forEach(r =>
      console.log(`  - ${r.endpoint} [${r.cargo}]: esperado ${r.esperado}, obtido ${r.obtido}`)
    );
    console.log();
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error('\n[ERRO FATAL]', err.message);
  process.exit(1);
});
