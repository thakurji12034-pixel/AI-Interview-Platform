import { useEffect, useState } from 'react';
import http from '../../api/http';
import { useAuth } from '../../context/useAuth';
import { AlertTriangle, Cpu, Server, Sparkles, X } from 'lucide-react';

export const CapabilitiesBanner = () => {
  const { user } = useAuth();
  const [capabilities, setCapabilities] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) return;

    const fetchCaps = async () => {
      try {
        const res = await http.get('/system/capabilities');
        if (active) {
          setCapabilities(res.data);
        }
      } catch {
        // Silently ignore capability fetch errors
      }
    };

    fetchCaps();
    return () => {
      active = false;
    };
  }, [user]);

  if (!capabilities || dismissed) return null;

  const isMockAi = capabilities.aiProvider === 'mock';
  const isMockExecution = capabilities.executionProvider === 'mock';
  const isInMemoryRedis = capabilities.redis === 'in-memory';

  // Only show if at least one subsystem is simulated
  if (!isMockAi && !isMockExecution && !isInMemoryRedis) {
    return null;
  }

  return (
    <aside
      aria-label="System Demonstration Mode Warning"
      className="bg-amber-500/10 border-b border-amber-500/20 text-amber-900 dark:text-amber-200 px-4 py-2 text-xs transition-colors"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Demonstration Mode Active:</span>
          </div>
          <span className="text-slate-600 dark:text-slate-300">
            Platform is running with simulated backend providers. No live third-party cloud billing incurred.
          </span>
          <div className="flex flex-wrap items-center gap-1.5 ml-1">
            {isMockAi && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                title="AI evaluations and questions are synthetically generated"
              >
                <Sparkles className="w-3 h-3 text-amber-600" />
                Simulated AI
              </span>
            )}
            {isMockExecution && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800"
                title="Code test results run against in-memory simulation engine"
              >
                <Cpu className="w-3 h-3 text-indigo-600" />
                Simulated Code Execution
              </span>
            )}
            {isInMemoryRedis && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                title="In-memory cache fallback used in place of external Redis cluster"
              >
                <Server className="w-3 h-3 text-slate-500" />
                In-Memory Redis
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 p-1 rounded-md hover:bg-amber-500/10 transition-colors"
          aria-label="Dismiss demo mode warning banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
