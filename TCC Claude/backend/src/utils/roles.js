// Hierarquia de cargos: Administrador > Sócio > Operador.
// Administrador e sócio têm as mesmas funções de gestão; a diferença é que ninguém pode
// alterar, desativar, remover ou criar um cargo superior ao seu.
const RANK = { user: 1, socio: 2, admin: 3 };

const rank = (role) => RANK[role] || 0;
const cargoValido = (role) => Object.prototype.hasOwnProperty.call(RANK, role);
const isGestor = (role) => rank(role) >= RANK.socio;
// Pode agir sobre um alvo de mesmo cargo ou inferior
const podeGerenciar = (ator, alvo) => rank(alvo) <= rank(ator);

module.exports = { RANK, rank, cargoValido, isGestor, podeGerenciar };
