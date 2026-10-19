// Cargos e hierarquia (espelha backend/src/utils/roles.js): Administrador > Sócio > Operador.
// Administrador e sócio têm as mesmas funções de gestão; ninguém altera, desativa, remove
// nem cria um cargo superior ao seu.
export const ROLES = { admin: 'Administrador', socio: 'Sócio', user: 'Operador' };

const RANK = { user: 1, socio: 2, admin: 3 };
export const rank = (role) => RANK[role] || 0;

// Funções de gestão (equipe, editar e remover produtos): administrador e sócio
export const isGestor = (role) => rank(role) >= RANK.socio;

// Pode agir sobre um alvo de mesmo cargo ou inferior
export const podeGerenciar = (ator, alvo) => rank(alvo) <= rank(ator);

// Cargos que quem está logado pode atribuir (do mais alto ao mais baixo)
export const cargosAtribuiveis = (ator) =>
  Object.keys(ROLES).filter((c) => rank(c) <= rank(ator)).sort((a, b) => rank(b) - rank(a));

export const corCargo = (role) =>
  role === 'admin'
    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
    : role === 'socio'
      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
