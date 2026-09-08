import React from 'react';
import { 
  RefreshCw, 
  Database, 
  ShieldCheck, 
  FolderOpen, 
  Calendar,
  Layers,
  AlertTriangle,
  Clock,
  BarChart2,
  Boxes
} from 'lucide-react';
import { PeriodFilter } from '../types';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  lastSyncDate: string;
  isSyncing: boolean;
  onTriggerSync: () => void;
  selectedPeriod: PeriodFilter;
  setSelectedPeriod: (p: PeriodFilter) => void;
  onOpenQualityModal: () => void;
  onOpenFolderModal: () => void;
  pendingNewFilesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  lastSyncDate,
  isSyncing,
  onTriggerSync,
  selectedPeriod,
  setSelectedPeriod,
  onOpenQualityModal,
  onOpenFolderModal,
  pendingNewFilesCount
}) => {
  const formatDisplayDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }) + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '06/09/2026 22:30';
    }
  };

  const navItems = [
    { id: 'tower', label: 'Dashboard Global MP', icon: Layers },
    { id: 'msp', label: '01. MSP (Manquants)', icon: AlertTriangle },
    { id: 'mdp', label: '02. MDP (Carnet & Exceptions)', icon: Clock },
    { id: 'variation', label: '03. Variation Planning (Waterfall)', icon: BarChart2 },
    { id: 'otif', label: '04. OTIF & Moyenne 3 Mois (Average)', icon: ShieldCheck },
    { id: 'stock', label: '05. Suivi de Stock', icon: Boxes },
    { id: 'pf', label: '06. Produits Finis', icon: Database },
    { id: 'sources', label: 'Data Sources & Dossiers', icon: FolderOpen }
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 text-slate-100 shadow-md">
      {/* Top Banner: Discrete Data Refresh & Status (Requirement 47) */}
      <div className="bg-slate-950/80 px-4 lg:px-8 py-1.5 border-b border-slate-800/80 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4 text-slate-300">
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-slate-400">Dernière synchronisation :</span>
            <span className="font-semibold text-emerald-400">{formatDisplayDate(lastSyncDate)}</span>
          </div>
          <div className="h-3 w-px bg-slate-700 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Data Status :</span>
            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              🟢 Up to date
            </span>
          </div>
          {pendingNewFilesCount > 0 && (
            <span className="inline-flex items-center gap-1 bg-amber-950/60 border border-amber-800/50 text-amber-300 px-2 py-0.5 rounded-full text-[11px] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
              {pendingNewFilesCount} nouveau(x) fichier(s) détecté(s)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenFolderModal}
            className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1.5 hover:underline cursor-pointer"
            id="btn-inspect-folders"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            <span>Explorer les 4 dossiers publics</span>
          </button>
          <div className="h-3 w-px bg-slate-700" />
          <button
            onClick={onOpenQualityModal}
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 hover:underline cursor-pointer"
            id="btn-quality-report-header"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Qualité données : 98.7%</span>
          </button>
        </div>
      </div>

      {/* Main Bar */}
      <div className="px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                <span className="text-sky-400 font-black tracking-wider">ALSTOM</span>
                <span className="text-slate-500 font-normal">|</span>
                <span>Material Planning Control Tower</span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Système de pilotage Material Planning (MSP, MDP Messages 10/15/20, Produits Finis, OTIF & Waterfall)
            </p>
          </div>
        </div>

        {/* Global Actions: Period Selector & Sync Button */}
        <div className="flex items-center gap-3">
          {/* Period Selector (Requirement 39) */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200">
            <Calendar className="h-3.5 w-3.5 text-slate-400 mr-2" />
            <span className="text-slate-400 mr-1.5 hidden sm:inline">Période :</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as PeriodFilter)}
              className="bg-transparent text-xs text-slate-100 font-medium focus:outline-none cursor-pointer"
              id="select-period-filter"
            >
              <option value="this_week" className="bg-slate-900 text-slate-100">Cette semaine (W35/W36)</option>
              <option value="prev_week" className="bg-slate-900 text-slate-100">Semaine précédente (W34)</option>
              <option value="last_4_weeks" className="bg-slate-900 text-slate-100">4 dernières semaines</option>
              <option value="last_3_months" className="bg-slate-900 text-slate-100">3 derniers mois</option>
              <option value="last_6_months" className="bg-slate-900 text-slate-100">6 derniers mois</option>
              <option value="last_12_months" className="bg-slate-900 text-slate-100">12 derniers mois</option>
              <option value="all" className="bg-slate-900 text-slate-100">Tout l'historique (2026)</option>
              <option value="custom" className="bg-slate-900 text-slate-100">Personnalisé</option>
            </select>
          </div>

          {/* Sync Button (Requirement 37: 🔄 SYNCHRONISER LES DONNÉES) */}
          <button
            onClick={onTriggerSync}
            disabled={isSyncing}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold shadow transition-all cursor-pointer ${
              isSyncing
                ? 'bg-sky-700 text-white cursor-not-allowed opacity-80'
                : 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-sky-900/30'
            }`}
            id="btn-sync-data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Synchronisation...' : '🔄 SYNCHRONISER LES DONNÉES'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="px-4 lg:px-8 flex overflow-x-auto space-x-1 border-t border-slate-800 scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'border-sky-400 text-sky-400 bg-sky-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
              id={`nav-tab-${item.id}`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
              {item.id === 'sources' && pendingNewFilesCount > 0 && (
                <span className="h-2 w-2 rounded-full bg-amber-400" />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
