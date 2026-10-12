export default function ThemeToggle({ isDark, onToggle }) {
  return (
    <button
      type="button"
      className={`theme-toggle${isDark ? ' dark' : ''}`}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      onClick={onToggle}
    >
      <span className="theme-icon theme-sun" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="4" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M12 2v2" /><path d="M12 20v2" />
            <path d="M4.93 4.93l1.42 1.42" /><path d="M17.65 17.65l1.42 1.42" />
            <path d="M2 12h2" /><path d="M20 12h2" />
            <path d="M4.93 19.07l1.42-1.42" /><path d="M17.65 6.35l1.42-1.42" />
          </g>
        </svg>
      </span>

      <span className="theme-icon theme-moon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path
            d="M20.2 15.1A8.5 8.5 0 0 1 8.9 3.8 8.6 8.6 0 1 0 20.2 15.1Z"
            fill="currentColor"
          />
          <path
            d="M17.5 3.5v3M16 5h3"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      </span>

      <span className="theme-thumb" aria-hidden="true">
        <span className="thumb-glow" />
      </span>
    </button>
  );
}
