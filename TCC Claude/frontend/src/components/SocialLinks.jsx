const GITHUB_URL = 'https://github.com/Pansera13/TCC';
const LINKEDIN_URL = 'https://www.linkedin.com/in/lucas-pansera-a80b92320/';

export default function SocialLinks() {
  return (
    <div className="fixed bottom-0 left-0 flex gap-4 p-6 z-30">
      <a href={GITHUB_URL} target="_blank" rel="noreferrer" title="GitHub">
        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white/40 dark:bg-white/10 hover:bg-white/70 dark:hover:bg-white/20 transition shadow">
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-gray-700 dark:fill-gray-200">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.468-2.381 1.235-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.3 1.23a11.52 11.52 0 0 1 3.003-.404c1.02.005 2.047.138 3.006.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.61-2.807 5.625-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .322.218.694.825.576C20.565 21.796 24 17.298 24 12 24 5.37 18.627 0 12 0z"/>
          </svg>
        </div>
      </a>

      <a href={LINKEDIN_URL} target="_blank" rel="noreferrer" title="LinkedIn">
        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white/40 dark:bg-white/10 hover:bg-white/70 dark:hover:bg-white/20 transition shadow">
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-blue-600 dark:fill-blue-400">
            <path d="M20.447 20.452H17.21v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.987V9h3.102v1.561h.046c.432-.818 1.489-1.681 3.065-1.681 3.276 0 3.881 2.155 3.881 4.959v6.613zM5.337 7.433a1.8 1.8 0 1 1 0-3.601 1.8 1.8 0 0 1 0 3.601zM6.891 20.452H3.78V9h3.111v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
        </div>
      </a>
    </div>
  );
}
