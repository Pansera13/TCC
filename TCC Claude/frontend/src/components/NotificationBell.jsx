import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { dispensarNotificacao, listNotificacoes, marcarNotificacoesLidas } from '../services/api';

const ACOES = {
  'abrir-email-recuperacao': 'Cadastrar agora',
};

const INTERVALO_MS = 60000;

// Sino de notificações. O Realtime só avisa que algo mudou para este usuário (tabela notificacoes_aviso);
// o conteúdo sempre vem da API autenticada. A consulta a cada 60 s e a recarga ao voltar o foco cobrem falhas do Realtime.
// `recarregarEm` muda quando outra parte da tela sabe que as notificações mudaram (ex.: e-mail de recuperação salvo).
export default function NotificationBell({ usuarioId, onAcao, recarregarEm }) {
  const [itens, setItens] = useState([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [aberto, setAberto] = useState(false);
  const raizRef = useRef(null);
  const abertoRef = useRef(false);

  const carregar = useCallback(async () => {
    try {
      const { data } = await listNotificacoes();
      setItens(data.itens);
      // Com o menu aberto, o que chega já é visto: mantém o contador em zero
      setNaoLidas(abertoRef.current ? 0 : data.nao_lidas);
    } catch {
      // falha de rede: mantém o que está na tela; a próxima consulta tenta de novo
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar, recarregarEm]);

  useEffect(() => {
    const timer = setInterval(carregar, INTERVALO_MS);
    const aoVoltar = () => { if (document.visibilityState === 'visible') carregar(); };
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('focus', carregar);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('focus', carregar);
    };
  }, [carregar]);

  useEffect(() => {
    if (!usuarioId) return undefined;
    const canal = supabase
      .channel(`notificacoes-aviso-${usuarioId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notificacoes_aviso', filter: `usuario_id=eq.${usuarioId}` }, carregar)
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [usuarioId, carregar]);

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => {
      if (raizRef.current && !raizRef.current.contains(e.target)) { abertoRef.current = false; setAberto(false); }
    };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [aberto]);

  async function alternar() {
    const abrindo = !aberto;
    abertoRef.current = abrindo;
    setAberto(abrindo);
    if (abrindo && naoLidas > 0) {
      setNaoLidas(0);
      setItens(l => l.map(n => ({ ...n, lida: true })));
      try { await marcarNotificacoesLidas(); } catch { /* a próxima consulta corrige */ }
    }
  }

  async function dispensar(id) {
    setItens(l => l.filter(n => n.id !== id));
    try { await dispensarNotificacao(id); } catch { carregar(); }
  }

  return (
    <div className="relative" ref={raizRef}>
      <button
        onClick={alternar}
        title="Notificações"
        aria-label={naoLidas > 0 ? `Notificações, ${naoLidas} não lidas` : 'Notificações'}
        aria-expanded={aberto}
        className="relative p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {naoLidas > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[1rem] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-4 text-center">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-1.5rem)] max-h-96 overflow-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg z-50">
          {itens.length === 0 ? (
            <p className="px-4 py-6 text-sm text-center text-gray-400">Nenhuma notificação</p>
          ) : (
            <ul>
              {itens.map(n => (
                <li key={n.id} className="relative px-4 py-3 pr-9 border-b last:border-b-0 border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => dispensar(n.id)}
                    title="Dispensar"
                    aria-label="Dispensar notificação"
                    className="absolute top-1.5 right-1.5 p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-sm leading-none"
                  >✕</button>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">{n.titulo}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.texto}</p>
                  {ACOES[n.acao] && (
                    <button
                      onClick={() => { setAberto(false); abertoRef.current = false; onAcao?.(n.acao); }}
                      className="mt-2 text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      {ACOES[n.acao]}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
