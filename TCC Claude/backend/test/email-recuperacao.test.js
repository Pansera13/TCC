// Rode com: node test/email-recuperacao.test.js
const assert = require('assert');
const { validarEmailRecuperacao, sugerirDominio } = require('../src/utils/emailRecuperacao');

assert.deepStrictEqual(validarEmailRecuperacao('a@gmail.com', 'login@empresa.com'), { ok: true, email: 'a@gmail.com' });
assert.strictEqual(validarEmailRecuperacao('  A@Gmail.COM ', 'login@empresa.com').email, 'a@gmail.com');

assert.strictEqual(validarEmailRecuperacao('a@exemplo.com', 'login@empresa.com').ok, false);
assert.strictEqual(validarEmailRecuperacao('sem-arroba', 'login@empresa.com').ok, false);
assert.strictEqual(validarEmailRecuperacao('', 'login@empresa.com').ok, false);

// igual ao login, com maiúsculas e espaços
const igual = validarEmailRecuperacao(' LOGIN@Gmail.com ', 'login@gmail.com');
assert.strictEqual(igual.ok, false);
assert.match(igual.message, /diferente/);

// sugestão
assert.strictEqual(validarEmailRecuperacao('a@gmial.com', 'x@y.com').sugestao, 'gmail.com');
assert.strictEqual(sugerirDominio('gmial.com'), 'gmail.com');
assert.strictEqual(sugerirDominio('hotmal.com'), 'hotmail.com');
assert.strictEqual(sugerirDominio('empresaqualquer.com.br'), null);
assert.strictEqual('sugestao' in validarEmailRecuperacao('a@empresaqualquer.com.br', 'x@y.com'), false);

console.log('email-recuperacao: ok');
