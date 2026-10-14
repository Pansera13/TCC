export default function ThemeToggle({ isDark, onToggle }) {
  return (
    <div className="theme-toggle-wrap">
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
        className={`theme-toggle${isDark ? ' dark' : ''}`}
        onClick={onToggle}
      >
        {/* Sol */}
        <span className="tgl-icon tgl-sun">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
            <line x1="12" y1="2"    x2="12" y2="5.5" />
            <line x1="12" y1="18.5" x2="12" y2="22" />
            <line x1="2"  y1="12"   x2="5.5" y2="12" />
            <line x1="18.5" y1="12" x2="22"  y2="12" />
            <line x1="4.93" y1="4.93"   x2="7.17" y2="7.17" />
            <line x1="16.83" y1="16.83" x2="19.07" y2="19.07" />
            <line x1="19.07" y1="4.93"  x2="16.83" y2="7.17" />
            <line x1="7.17"  y1="16.83" x2="4.93"  y2="19.07" />
          </svg>
        </span>

        {/* Thumb deslizante */}
        <span className="tgl-thumb">
          <span className="thumb-glow" />
        </span>

        {/* Lua */}
        <span className="tgl-icon tgl-moon">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            <path d="M17.5 3.5l.4 1.2 1.2.4-1.2.4-.4 1.2-.4-1.2-1.2-.4 1.2-.4z" />
          </svg>
        </span>
      </button>
    </div>
  );
}
