import ThemeToggle from './ThemeToggle';
import { ROLES } from '../utils/roles';

// Barra de navegação superior fixa (altura máxima de 1,5 cm).
// O estado do menu de perfil fica no Dashboard e chega por props.
export default function TopNav({
  items, activeNav, onSelect,
  user, isAdmin,
  darkMode, onToggleDark,
  profileRef, photoInputRef, onPhotoChange,
  showProfileMenu, setShowProfileMenu,
  editingName, setEditingName,
  newName, setNewName, onSaveName,
  onLogout,
}) {
  return (
    <nav
      className="relative z-40 flex items-center gap-2 h-14 px-3 bg-white dark:bg-gray-900 shadow-sm border-b border-gray-100 dark:border-gray-800 shrink-0"
      style={{ maxHeight: '1.5cm' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <img src="/logo.png" alt="logo" className="w-7 h-7 shrink-0 mix-blend-multiply dark:mix-blend-screen" />
        <span className="hidden md:inline font-bold text-gray-800 dark:text-white text-sm tracking-tight">StockFlow</span>
      </div>

      {/* Opções de menu — rolam na horizontal se não couberem, sem aumentar a altura */}
      <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            title={item.label}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all shrink-0
              ${activeNav === item.id
                ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
          >
            <span className="text-base shrink-0">{item.icon}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Tema + perfil */}
      <div className="flex items-center gap-3 shrink-0">
        <ThemeToggle isDark={darkMode} onToggle={onToggleDark} />

        <div className="relative" ref={profileRef}>
          <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
          <button
            onClick={() => { setShowProfileMenu(v => !v); setEditingName(false); }}
            className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-left"
            title="Perfil"
          >
            <div className="w-8 h-8 rounded-full bg-purple-600 overflow-hidden shrink-0 flex items-center justify-center">
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                : <span className="text-white text-sm font-bold">{user?.nome?.[0]?.toUpperCase() || '?'}</span>
              }
            </div>
            <div className="hidden lg:block min-w-0 leading-tight">
              <p className="text-sm font-medium text-gray-800 dark:text-white truncate max-w-[8rem]">{user?.nome}</p>
              <p className="text-xs text-gray-400">{ROLES[user?.role] || (isAdmin ? 'Administrador' : 'Operador')}</p>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden z-50">
              {editingName ? (
                <div className="px-3 py-2 flex flex-col gap-2">
                  <input
                    autoFocus
                    className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white outline-none focus:border-purple-500"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') onSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                    placeholder="Novo nome"
                  />
                  <div className="flex gap-1">
                    <button onClick={() => setEditingName(false)} className="flex-1 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition">Cancelar</button>
                    <button onClick={onSaveName} className="flex-1 py-1 text-xs rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition">Salvar</button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    className="w-full flex items-center gap-3 px-4 py-3 text-base text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition text-left"
                  >
                    📷 Alterar foto
                  </button>
                  <button
                    onClick={() => { setNewName(user?.nome || ''); setEditingName(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-base text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition text-left"
                  >
                    ✏️ Alterar nome
                  </button>
                  <div className="border-t border-gray-100 dark:border-gray-700" />
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-base text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition text-left"
                  >
                    🚪 Sair da conta
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
