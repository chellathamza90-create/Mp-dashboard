import React from 'react';
import { 
  X, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Layers, 
  Users, 
  Calendar, 
  Copy,
  Info
} from 'lucide-react';
import { DataQualityReport } from '../types';

interface DataQualityModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: DataQualityReport;
}

export const DataQualityModal: React.FC<DataQualityModalProps> = ({
  isOpen,
  onClose,
  report
}) => {
  if (!isOpen) return null;

  const metricCards = [
    { label: 'Fichiers analysés', value: report.filesAnalyzed.toLocaleString(), icon: FileText, color: 'text-sky-400 bg-sky-950/40 border-sky-800/40' },
    { label: 'Lignes analysées', value: report.linesAnalyzed.toLocaleString(), icon: Layers, color: 'text-indigo-400 bg-indigo-950/40 border-indigo-800/40' },
    { label: 'Erreurs', value: report.errors, icon: AlertTriangle, color: 'text-rose-400 bg-rose-950/40 border-rose-800/40' },
    { label: 'Doublons', value: report.duplicates, icon: Copy, color: 'text-amber-400 bg-amber-950/40 border-amber-800/40' },
    { label: 'Colonnes manquantes', value: report.missingColumns, icon: Info, color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40' },
    { label: 'Dates invalides', value: report.invalidDates, icon: Calendar, color: 'text-orange-400 bg-orange-950/40 border-orange-800/40' },
    { label: 'Fournisseurs inconnus', value: report.unknownSuppliers, icon: Users, color: 'text-purple-400 bg-purple-950/40 border-purple-800/40' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        id="modal-data-quality"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Rapport Qualité des Données</h3>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Score : {report.qualityScore}% Conforme
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Audit automatique post-synchronisation multi-dossiers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            id="btn-close-quality-modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Key Metric Blocks (prompt 46 exact fields) */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Indicateurs de fiabilité du pipeline
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {metricCards.map((m, idx) => {
                const Icon = m.icon;
                return (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-xl border flex flex-col justify-between ${m.color}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-300">{m.label}</span>
                      <Icon className="h-4 w-4 opacity-70" />
                    </div>
                    <div className="text-xl font-bold text-white mt-2 font-mono">
                      {m.value}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audit Details & Actions Log */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Journal des contrôles d'intégrité & corrections
              </h4>
              <span className="text-xs text-slate-400 font-mono">
                {report.issues.length} événements enregistrés
              </span>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
              <div className="divide-y divide-slate-800/80">
                {report.issues.map((iss) => (
                  <div key={iss.id} className="p-3.5 flex items-start gap-3 hover:bg-slate-800/30 transition">
                    <div className="mt-0.5">
                      {iss.severity === 'high' ? (
                        <AlertTriangle className="h-4 w-4 text-rose-400" />
                      ) : iss.severity === 'medium' ? (
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-sky-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-medium text-slate-200">
                          {iss.fileName}
                        </span>
                        {iss.rowNumber && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                            Ligne {iss.rowNumber}
                          </span>
                        )}
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {iss.folderKey.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{iss.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pipeline Auto-Recovery Summary */}
          <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-800/40 flex items-start gap-3">
            <Info className="h-5 w-5 text-sky-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300">
              <p className="font-semibold text-sky-300 mb-1">Mécanisme d'auto-guérison activé</p>
              <p className="text-slate-400">
                Toutes les anomalies mineures (doublons de lignes, écarts de typographie fournisseurs, syntaxes de dates locales) sont normalisées automatiquement dans la base historique sans bloquer le calcul des KPI ni nécessiter d'intervention manuelle.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            Rapport généré le {new Date(report.timestamp).toLocaleString('fr-FR')}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
          >
            Fermer le rapport
          </button>
        </div>
      </div>
    </div>
  );
};
