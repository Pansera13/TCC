export const ROLES = { admin: 'Administrador', socio: 'Sócio', user: 'Funcionário' };

export const corCargo = (role) =>
  role === 'admin'
    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
    : role === 'socio'
      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
