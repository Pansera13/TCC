// Cargos e permissões. Fonte única da matriz: o backend impõe e o frontend só reflete
// (recebe a lista em `permissoes` no login e em GET /api/profile).
// Hierarquia com herança: Funcionário (user) < Sócio (socio) < Administrador (admin).
const NIVEIS = { user: 1, socio: 2, admin: 3 };

// permissão -> nível mínimo exigido
const PERMISSOES = {
  'estoque:ver': NIVEIS.user,
  'produto:retirar': NIVEIS.user,
  'produto:entrada': NIVEIS.user,
  'movimentacao:ver-proprias': NIVEIS.user,

  'produto:cadastrar': NIVEIS.socio,
  'produto:editar': NIVEIS.socio,
  'produto:arquivar': NIVEIS.socio,
  'produto:importar-nfe': NIVEIS.socio,
  'relatorio:ver': NIVEIS.socio,
  'movimentacao:ver-todas': NIVEIS.socio,
  'equipe:ver': NIVEIS.socio,
  'usuario:criar-funcionario': NIVEIS.socio,
  'usuario:status-funcionario': NIVEIS.socio,

  'produto:restaurar': NIVEIS.admin,
  'produto:excluir': NIVEIS.admin,
  'produto:ver-arquivados': NIVEIS.admin,
  'usuario:excluir': NIVEIS.admin,
  'usuario:criar-privilegiado': NIVEIS.admin,
  'usuario:alterar-cargo': NIVEIS.admin,
  'usuario:gerenciar-privilegiado': NIVEIS.admin,
};

const nivel = (cargo) => NIVEIS[cargo] || 0;
const cargoValido = (cargo) => Object.prototype.hasOwnProperty.call(NIVEIS, cargo);

function can(cargo, permissao) {
  const minimo = PERMISSOES[permissao];
  return minimo !== undefined && nivel(cargo) >= minimo;
}

// Lista de chaves que o cargo possui (enviada ao frontend)
const permissoesDoCargo = (cargo) => Object.keys(PERMISSOES).filter((p) => can(cargo, p));

// Administrador altera qualquer conta válida (a própria é barrada no controller); Sócio só Funcionário
function podeAlterarConta(cargoAtor, cargoAlvo) {
  if (cargoAtor === 'admin') return cargoValido(cargoAlvo);
  if (cargoAtor === 'socio') return cargoAlvo === 'user';
  return false;
}

// Administrador cria qualquer cargo; Sócio só Funcionário
function podeCriarCargo(cargoAtor, cargoNovo) {
  if (cargoAtor === 'admin') return cargoValido(cargoNovo);
  if (cargoAtor === 'socio') return cargoNovo === 'user';
  return false;
}

module.exports = { NIVEIS, PERMISSOES, nivel, cargoValido, can, permissoesDoCargo, podeAlterarConta, podeCriarCargo };
