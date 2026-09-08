import React, { useEffect } from 'react';
import { RefreshCw, CheckCircle2, X } from 'lucide-react';
import { SyncProgressUpdate } from '../services/dataPipeline';

interface SyncProgressBannerProps {
  progress: SyncProgressUpdate | null;
  isSyncing: boolean;
  lastResultSummary?: string | null;
  onDismissSummary?: () => void;
}

export const SyncProgressBanner: React.FC<SyncProgressBannerProps> = ({
  progress,
  isSyncing,
  lastResultSummary,
  onDismissSummary
}) => {
  // Auto-dismiss summary toast after 4 seconds
  useEffect(() => {
    if (lastResultSummary && onDismissSummary) {
      const timer = setTimeout(() => {
        onDismissSummary();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [lastResultSummary, onDismissSummary]);

  if (!isSyncing && !lastResultSummary) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md w-full px-4 pointer-events-none">
      {isSyncing && progress && (
        <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-sky-500/40 p-3.5 rounded-xl text-slate-100 shadow-2xl shadow-sky-950/50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400 flex-shrink-0">
              <RefreshCw className="h-4 w-4 animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                  Mise à jour ({Math.round((progress.stepIndex / progress.totalSteps) * 100)}%)
                </span>
                <span className="text-[11px] font-semibold text-slate-300">
                  {progress.stepName}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">{progress.detail}</p>
            </div>
          </div>
        </div>
      )}

      {!isSyncing && lastResultSummary && (
        <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-emerald-500/40 p-3.5 rounded-xl text-emerald-200 shadow-2xl shadow-emerald-950/50 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2.5 text-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <span className="font-medium text-slate-100">{lastResultSummary}</span>
          </div>
          {onDismissSummary && (
            <button
              onClick={onDismissSummary}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
