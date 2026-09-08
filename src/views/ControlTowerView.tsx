import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  ChevronRight, 
  ArrowUpRight, 
  Layers, 
  TrainFront,
  AlertCircle,
  FileCheck,
  BarChart3,
  PieChart as PieChartIcon,
  Zap,
  Flame,
  Filter,
  Package,
  Boxes,
  Calendar,
  Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  Line,
  ComposedChart,
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine,
  Legend
} from 'recharts';
import { MSPRecord, MDPRecord, PFRecord, OTIFRecord, StockRecord, PeriodFilter, FolderConfig } from '../types';
import { MONTH_NAMES_FR, PROJECTS } from '../services/initialData';

interface ControlTowerViewProps {
  mspRecords: MSPRecord[];
  mdpRecords: MDPRecord[];
  pfRecords: PFRecord[];
  otifRecords: OTIFRecord[];
  stockRecords?: StockRecord[];
  folders: FolderConfig[];
  selectedPeriod: PeriodFilter;
  onNavigateTab: (tab: string) => void;
  onOpenQualityModal: () => void;
}

export const ControlTowerView: React.FC<ControlTowerViewProps> = ({
  mspRecords,
  mdpRecords,
  pfRecords,
  otifRecords,
  stockRecords = [],
  folders,
  selectedPeriod,
  onNavigateTab,
  onOpenQualityModal
}) => {
  // State for Project-level Waterfall and Weekly PF Demand
  const [selectedWfProject, setSelectedWfProject] = useState<string>('all');
  const [wfDisplayMode, setWfDisplayMode] = useState<'waterfall' | 'weekly_demand'>('waterfall');
  const [selectedCompWeek, setSelectedCompWeek] = useState<number>(35); // Semaine d'analyse W vs W-1

  // Compute Key Metrics
  // 1. OTIF Average 3M (Derniers 3 mois : Juin, Juillet, Août)
  const last3Months = [6, 7, 8];
  const otif3MRecords = otifRecords.filter(r => last3Months.includes(r.month));
  const avg3MOtif = otif3MRecords.length > 0
    ? (otif3MRecords.reduce((acc, r) => acc + r.otifRate, 0) / otif3MRecords.length).toFixed(1)
    : '94.6';

  // 2. OTIF Résultat du Mois en cours (Août 2026 / Mois 8)
  const currentMonthRecords = otifRecords.filter(r => r.month === 8);
  const currentMonthOtif = currentMonthRecords.length > 0
    ? (currentMonthRecords.reduce((acc, r) => acc + r.otifRate, 0) / currentMonthRecords.length).toFixed(1)
    : '94.8';
  const conformingSuppliersCurrentMonth = currentMonthRecords.filter(r => r.otifRate >= 95.0).length;

  // 3. Missing Parts count
  const criticalMsp = mspRecords.filter((r) => r.criticality === 'Critique').length;
  const totalMspQty = mspRecords.reduce((acc, r) => acc + r.missingQuantity, 0);

  // 4. MDP & Exception Messages
  const confirmedMdpCount = mdpRecords.filter((r) => r.status === 'Confirmé').length;
  const mdpConfirmRate = mdpRecords.length > 0
    ? Math.round((confirmedMdpCount / mdpRecords.length) * 100)
    : 78;
  const msg10Count = mdpRecords.filter((r) => r.exceptionCode === '10').length;
  const msg15Count = mdpRecords.filter((r) => r.exceptionCode === '15').length;
  const msg20Count = mdpRecords.filter((r) => r.exceptionCode === '20').length;

  // 5. Finished Products (PF)
  const delayedPfCount = pfRecords.filter((r) => r.statusOF === 'En retard' || r.statusOF === 'Bloqué').length;
  const inProgressPfCount = pfRecords.filter((r) => r.statusOF === 'En cours').length;
  const deliveredPfCount = pfRecords.filter((r) => r.statusOF === 'Livré').length;

  // 6. Stock Tracking Quick Metrics
  const totalStockValue = stockRecords.reduce((acc, r) => acc + r.stockValue, 0);
  const totalDormantValue = stockRecords.reduce((acc, r) => acc + r.dormantStockValue, 0);
  const stockAlertsCount = stockRecords.filter(r => r.stockStatus === 'Alerte Mini' || r.stockStatus === 'Rupture Imminente').length;

  // Chart Data 1: Weekly MSP Trend (W12 to W35)
  const weeks = (Array.from(new Set(mspRecords.map((r) => r.week))) as number[]).sort((a, b) => a - b).slice(-8);
  const weeklyMspData = weeks.map((w) => {
    const wRecords = mspRecords.filter((r) => r.week === w);
    return {
      week: `W${w}`,
      pieces: wRecords.reduce((acc, r) => acc + r.missingQuantity, 0),
      critical: wRecords.filter((r) => r.criticality === 'Critique').length
    };
  });

  // Chart Data 2: MRP Exception Messages Distribution
  const exceptionPieData = [
    { name: 'Msg 10 (Avancement)', value: msg10Count || 24, color: '#f43f5e' },
    { name: 'Msg 15 (Report)', value: msg15Count || 38, color: '#f59e0b' },
    { name: 'Msg 20 (À Annuler)', value: msg20Count || 16, color: '#a855f7' },
    { name: 'Conformes', value: mdpRecords.length - (msg10Count + msg15Count + msg20Count) || 120, color: '#10b981' }
  ];

  // Chart Data 3: Monthly OTIF (Jan - Aug)
  const monthlyOtifData = [1, 2, 3, 4, 5, 6, 7, 8].map((m) => {
    const mRecords = otifRecords.filter((r) => r.month === m);
    const avg = mRecords.length > 0 
      ? Number((mRecords.reduce((a, b) => a + b.otifRate, 0) / mRecords.length).toFixed(1))
      : 94.0;
    return {
      month: MONTH_NAMES_FR[m - 1].substring(0, 4) + '.',
      otif: avg,
      target: 95.0
    };
  });

  // Chart Data 4: Order Book by Railway Project
  const projectOrderData = PROJECTS.map((p) => {
    const pMdp = mdpRecords.filter((r) => r.project === p);
    const qty = pMdp.reduce((acc, r) => acc + r.quantity, 0) || 1500;
    return {
      name: p.replace('Alstom ', ''),
      fullName: p,
      quantity: qty
    };
  });

  // --- Dynamic Waterfall Calculation: Semaine W vs Semaine W-1 par Projet & Quantités de Produits Finis (PF) ---
  const compWeekPrev = selectedCompWeek - 1;

  // Filter PF records for the two compared weeks
  const pfForProject = selectedWfProject === 'all'
    ? pfRecords
    : pfRecords.filter(r => r.project === selectedWfProject);

  const prevWeekPfRecords = pfForProject.filter(r => r.week === compWeekPrev);
  const currWeekPfRecords = pfForProject.filter(r => r.week === selectedCompWeek);

  // Quantities for Week W-1 and Week W
  const baseWPrevQty = prevWeekPfRecords.reduce((acc, r) => acc + r.quantity, 0) || (selectedWfProject === 'all' ? 18 : 4);
  const baseWCurrQty = currWeekPfRecords.reduce((acc, r) => acc + r.quantity, 0) || (selectedWfProject === 'all' ? 16 : 3);

  // Breakdown of fluctuations between W-1 and W
  const newPfQty = currWeekPfRecords.filter(r => r.statusOF === 'Planifié').reduce((acc, r) => acc + r.quantity, 0) || 2;
  const advancedPfQty = Math.max(1, currWeekPfRecords.filter(r => r.statusOF === 'En cours').reduce((acc, r) => acc + r.quantity, 0) || 2);
  const delayedPfQty = Math.max(1, prevWeekPfRecords.filter(r => r.statusOF === 'En retard').reduce((acc, r) => acc + r.quantity, 0) || 3);
  const blockedPfQty = prevWeekPfRecords.filter(r => r.statusOF === 'Bloqué').reduce((acc, r) => acc + r.quantity, 0) || 1;
  const deliveredPfQty = prevWeekPfRecords.filter(r => r.statusOF === 'Livré').reduce((acc, r) => acc + (r.deliveredQuantity || r.quantity), 0) || Math.max(1, Math.round(baseWPrevQty * 0.3));

  // Mathematical closure for waterfall: Base W-1 + Nouveaux + Avances - Reports - Bloqués - Livrés = Net W
  const finalNetPfQty = Math.max(0, baseWPrevQty + newPfQty + advancedPfQty - delayedPfQty - blockedPfQty - deliveredPfQty);

  // Diagnostic de Fluctuation de Planning : Est-ce que le planning est reporté ou avancé ou stable ?
  const isPlanningReporte = delayedPfQty > advancedPfQty;
  const isPlanningAvance = advancedPfQty > delayedPfQty;
  const isPlanningStable = delayedPfQty === advancedPfQty;
  const netShiftQty = Math.abs(delayedPfQty - advancedPfQty);

  const planningStatusInfo = isPlanningReporte ? {
    label: 'PLANNING REPORTÉ',
    badgeClass: 'bg-rose-950/80 border-rose-800 text-rose-300',
    iconColor: 'text-rose-400',
    summary: `Glissement net de ${netShiftQty} PF vers les semaines ultérieures (Reports: ${delayedPfQty} PF vs Avances: ${advancedPfQty} PF).`,
    recommendation: `Décalage de fabrication constaté entre S${compWeekPrev} et S${selectedCompWeek}. Risque d'engorgement sur les postes d'assemblage en aval et dérive des jalons clients.`
  } : isPlanningAvance ? {
    label: 'PLANNING AVANCÉ',
    badgeClass: 'bg-emerald-950/80 border-emerald-800 text-emerald-300',
    iconColor: 'text-emerald-400',
    summary: `Accélération nette de ${netShiftQty} PF tirée vers l'amont (Avances: ${advancedPfQty} PF vs Reports: ${delayedPfQty} PF).`,
    recommendation: `Besoin anticipé entre S${compWeekPrev} et S${selectedCompWeek}. Sécuriser immédiatement la disponibilité des pièces manquantes (MSP) et les approvisionnements critiques.`
  } : {
    label: 'PLANNING STABLE',
    badgeClass: 'bg-sky-950/80 border-sky-800 text-sky-300',
    iconColor: 'text-sky-400',
    summary: `Équilibre parfait des flux entre S${compWeekPrev} et S${selectedCompWeek} (${advancedPfQty} PF avancés = ${delayedPfQty} PF reportés).`,
    recommendation: `Le plan de production respecte le cadencement initial. Maintenir les allocations de kits composants.`
  };

  // Waterfall Steps for Semaine W vs Semaine W-1
  const waterfallSteps = [
    {
      id: 'base_w_prev',
      name: `Besoin PF Semaine S${compWeekPrev} (Base W-1)`,
      shortName: `Besoin S${compWeekPrev}`,
      rawDelta: baseWPrevQty,
      isTotal: true,
      color: '#38bdf8', // sky-400
      bottom: 0,
      delta: baseWPrevQty,
      description: `Besoin en Produits Finis planifié en semaine S${compWeekPrev} (${selectedWfProject === 'all' ? 'Tous projets' : selectedWfProject.replace('Alstom ', '')})`
    },
    {
      id: 'new_pf',
      name: `+ Nouveaux Besoins PF (PDP S${selectedCompWeek})`,
      shortName: '+ Nouveaux PF',
      rawDelta: newPfQty,
      isTotal: false,
      color: '#10b981', // emerald-500
      bottom: baseWPrevQty,
      delta: newPfQty,
      description: `Nouveaux ordres de fabrication de PF injectés dans le PDP en S${selectedCompWeek}`
    },
    {
      id: 'adv_pf',
      name: `+ Besoins PF Avancés (Anticipation)`,
      shortName: '+ Avances PF',
      rawDelta: advancedPfQty,
      isTotal: false,
      color: '#06b6d4', // cyan-500
      bottom: baseWPrevQty + newPfQty,
      delta: advancedPfQty,
      description: `Ordres de PF dont le besoin a été avancé de semaines futures vers S${selectedCompWeek}`
    },
    {
      id: 'postpone_pf',
      name: `- Besoins PF Reportés (Décalages)`,
      shortName: '- Reports PF',
      rawDelta: -delayedPfQty,
      isTotal: false,
      color: '#f59e0b', // amber-500
      bottom: Math.max(0, baseWPrevQty + newPfQty + advancedPfQty - delayedPfQty),
      delta: delayedPfQty,
      description: `Ordres de PF décalés de S${compWeekPrev} vers des semaines ultérieures (retards)`
    },
    {
      id: 'blocked_pf',
      name: `- PF Bloqués (Manquants MSP/Qualité)`,
      shortName: '- Bloqués PF',
      rawDelta: -blockedPfQty,
      isTotal: false,
      color: '#a855f7', // purple-500
      bottom: Math.max(0, baseWPrevQty + newPfQty + advancedPfQty - delayedPfQty - blockedPfQty),
      delta: blockedPfQty,
      description: `Fabrications de PF suspendues pour pièces manquantes critiques ou contrôles qualité`
    },
    {
      id: 'delivered_pf',
      name: `- Livraisons PF Réalisées`,
      shortName: '- Livrés PF',
      rawDelta: -deliveredPfQty,
      isTotal: false,
      color: '#f43f5e', // rose-500
      bottom: finalNetPfQty,
      delta: deliveredPfQty,
      description: `Produits finis assemblés, homologués et livrés aux clients entre S${compWeekPrev} et S${selectedCompWeek}`
    },
    {
      id: 'final_w_curr',
      name: `= Besoin Net PF Semaine S${selectedCompWeek} (Actif W)`,
      shortName: `Besoin S${selectedCompWeek}`,
      rawDelta: finalNetPfQty,
      isTotal: true,
      color: '#6366f1', // indigo-500
      bottom: 0,
      delta: finalNetPfQty,
      description: `Carnet net de Produits Finis restant à livrer en semaine S${selectedCompWeek}`
    }
  ];

  // --- Weekly Finished Products Demand Calculation (Axe X = Semaines, Axe Y = Nbr PF Demandé) ---
  const allPfWeeks = (Array.from(new Set(pfRecords.map((r) => r.week))) as number[]).sort((a, b) => a - b);
  // Focus on the active planning horizon (e.g. W26 to W35)
  const activePfWeeks = allPfWeeks.slice(-10);

  const weeklyPfDemandData = activePfWeeks.map((w) => {
    const wRecords = (selectedWfProject === 'all'
      ? pfRecords
      : pfRecords.filter(r => r.project === selectedWfProject)
    ).filter(r => r.week === w);

    const demandePf = wRecords.reduce((acc, r) => acc + r.quantity, 0);
    const livresPf = wRecords.filter(r => r.statusOF === 'Livré').reduce((acc, r) => acc + (r.deliveredQuantity || r.quantity), 0);
    const enCoursPf = wRecords.filter(r => r.statusOF === 'En cours' || r.statusOF === 'Planifié').reduce((acc, r) => acc + r.quantity, 0);
    const retardPf = wRecords.filter(r => r.statusOF === 'En retard').reduce((acc, r) => acc + r.quantity, 0);
    const bloquesPf = wRecords.filter(r => r.statusOF === 'Bloqué').reduce((acc, r) => acc + r.quantity, 0);

    return {
      week: `S${w}`,
      weekLabel: `Semaine ${w}`,
      weekNumber: w,
      demandePf, // Nombre de PF demandé (Y-axis)
      livresPf,
      enCoursPf,
      retardPf,
      bloquesPf,
      nonLivresPf: Math.max(0, demandePf - livresPf),
      tauxServiceHebdo: demandePf > 0 ? Math.round((livresPf / demandePf) * 100) : 0
    };
  });

  const totalWeeklyPfDemande = weeklyPfDemandData.reduce((acc, d) => acc + d.demandePf, 0);
  const totalWeeklyPfLivres = weeklyPfDemandData.reduce((acc, d) => acc + d.livresPf, 0);
  const totalWeeklyPfEnCours = weeklyPfDemandData.reduce((acc, d) => acc + d.enCoursPf, 0);
  const totalWeeklyPfRetards = weeklyPfDemandData.reduce((acc, d) => acc + d.retardPf + d.bloquesPf, 0);

  // Priority Action Items
  const criticalActions = [
    {
      id: 'act-1',
      title: 'Demande d\'avancement urgente (Message 10) : REF-HYD-4091',
      project: 'Alstom Coradia Polyvalent',
      supplier: 'Knorr-Bremse Rail Systems',
      severity: 'Critique',
      impact: 'Besoin avancé de 6 jours pour sécuriser l\'assemblage OF-2026-1040',
      recommendedAction: 'Contacter acheteur pour avancer la livraison fournisseur'
    },
    {
      id: 'act-2',
      title: 'Besoin à annuler (Message 20) : PO-2026-8812 sans Need Date',
      project: 'Alstom Avelia Horizon TGV M',
      supplier: 'ABB Traction & Drives',
      severity: 'Critique',
      impact: 'Commande confirmée de 150 pièces sans besoin MRP actif',
      recommendedAction: 'Annuler la commande d\'achat pour éviter le surstock'
    },
    {
      id: 'act-3',
      title: 'Demande de report (Message 15) : REF-ELEC-3321 décalée',
      project: 'Alstom Citadis / Metropolis',
      supplier: 'Faiveley Transport (Wabtec)',
      severity: 'Majeur',
      impact: 'Besoin repoussé de 14 jours, risque de sur-stockage anticipé',
      recommendedAction: 'Négocier un report de livraison fournisseur'
    },
    {
      id: 'act-4',
      title: 'Dérive OTIF Voith Turbo Rail (Average 3M : 86.4%)',
      project: 'Multi-projets',
      supplier: 'Voith Turbo Rail',
      severity: 'Moyen',
      impact: 'Dérive sous le seuil contractuel de 95% sur les 3 derniers mois',
      recommendedAction: 'Lancer un plan de progrès et un audit de capacité'
    }
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Executive Welcome & Status Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-96 bg-sky-500/5 blur-3xl rounded-full pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase font-bold tracking-wider text-sky-400">
                Dashboard Global MP — Material Planning Control Tower
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-slate-300">
                Période active : <span className="font-semibold text-white">Semaine 35 / 2026</span>
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Dashboard Global MP
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Consolidation multi-dossiers automatique : Missing Parts (01_MSP), Planification des Besoins et Messages d'Exception 10/15/20 (02_MDP), Suivi des Produits Finis (03_PF), Scorecard OTIF avec Average 3M (04_OTIF), et Diagramme Waterfall des variations.
            </p>
          </div>

          {/* Quick sync status pill */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-3 text-xs">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <span className="text-slate-400 block text-[10px]">Sources publiques</span>
                <span className="font-semibold text-slate-200">4 / 4 Dossiers Connectés</span>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('sources')}
              className="px-4 py-2 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>Gérer les 4 dossiers</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4 Main Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: OTIF Average 3M */}
        <div 
          onClick={() => onNavigateTab('otif')}
          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 shadow-lg transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">OTIF Moyenne 3 Mois (Average)</span>
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">{avg3MOtif}%</span>
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" />
              Cible ≥ 95%
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Période Juin - Août 2026</span>
            <span className="text-emerald-400 group-hover:translate-x-0.5 transition flex items-center gap-1 text-[11px] font-semibold">
              Scorecard 3M <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
        </div>

        {/* Card 2: MSP Missing Parts */}
        <div 
          onClick={() => onNavigateTab('msp')}
          className="bg-slate-900 border border-slate-800 hover:border-rose-500/50 rounded-2xl p-5 shadow-lg transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">Missing Parts (MSP)</span>
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">{criticalMsp}</span>
            <span className="text-xs font-medium text-rose-400">
              critiques / {totalMspQty} pcs
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Risque arrêt de ligne</span>
            <span className="text-rose-400 group-hover:translate-x-0.5 transition flex items-center gap-1 text-[11px] font-semibold">
              Dashboard MSP <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
        </div>

        {/* Card 3: MDP & Messages d'Exception */}
        <div 
          onClick={() => onNavigateTab('mdp')}
          className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 shadow-lg transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">Messages d'Exception MDP</span>
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">{msg10Count + msg15Count + msg20Count}</span>
            <span className="text-xs font-medium text-amber-400">
              exceptions actives
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Msg 10: {msg10Count} | 15: {msg15Count} | 20: {msg20Count}</span>
            <span className="text-indigo-400 group-hover:translate-x-0.5 transition flex items-center gap-1 text-[11px] font-semibold">
              Dashboard MDP <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
        </div>

        {/* Card 4: Résultat OTIF du Mois (Replaces Carnet Net Final) */}
        <div 
          onClick={() => onNavigateTab('otif')}
          className="bg-slate-900 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-5 shadow-lg transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">Résultat OTIF du Mois</span>
            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">{currentMonthOtif}%</span>
            <span className="text-xs font-medium text-sky-300">
              Août 2026
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>{conformingSuppliersCurrentMonth}/10 FRS ≥ 95%</span>
            <span className="text-sky-400 group-hover:translate-x-0.5 transition flex items-center gap-1 text-[11px] font-semibold">
              Scorecard Mois <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Prominent Planning & PDP Section: Waterfall W vs W-1 & Profil Hebdomadaire */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-400 animate-pulse" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-sky-400" />
                {wfDisplayMode === 'waterfall'
                  ? `Analyse des Fluctuations de Planning (Semaine S${selectedCompWeek} vs S${compWeekPrev}) — Produits Finis (PF)`
                  : "Profil Hebdomadaire PDP — Semaines (Abscisses) vs Nombre de PF Demandé (Ordonnées)"}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {wfDisplayMode === 'waterfall'
                ? `Comparaison du besoin en Produits Finis entre la semaine S${compWeekPrev} et la semaine S${selectedCompWeek} pour identifier si le planning est reporté, avancé ou stable pour ${selectedWfProject === 'all' ? 'tous les projets' : selectedWfProject}.`
                : `Suivi temporel par semaine de la demande de Produits Finis (PF demandés, livrés, en cours et en retard) pour ${selectedWfProject === 'all' ? 'l\'ensemble des programmes' : selectedWfProject}.`}
            </p>
          </div>

          {/* View Mode Toggle: Waterfall Fluctuation vs Weekly Demand */}
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start lg:self-auto">
            <button
              onClick={() => setWfDisplayMode('waterfall')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                wfDisplayMode === 'waterfall'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Waterfall S vs S-1</span>
            </button>
            <button
              onClick={() => setWfDisplayMode('weekly_demand')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                wfDisplayMode === 'weekly_demand'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-900/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Semaines vs Nbr PF</span>
            </button>
          </div>
        </div>

        {/* Project Selector & Comparison Week Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/70">
          {/* Project Selector Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mr-1">
              <Filter className="h-3.5 w-3.5 text-sky-400" />
              Programme / Projet :
            </span>
            <button
              onClick={() => setSelectedWfProject('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                selectedWfProject === 'all'
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/40 font-semibold'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
              }`}
            >
              Tous les Projets
            </button>
            {PROJECTS.map((proj) => {
              const shortName = proj.replace('Alstom ', '');
              const isSelected = selectedWfProject === proj;
              return (
                <button
                  key={proj}
                  onClick={() => setSelectedWfProject(proj)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/40 font-semibold'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                  }`}
                >
                  <TrainFront className="h-3 w-3 opacity-70" />
                  <span>{shortName}</span>
                </button>
              );
            })}
          </div>

          {/* Week Comparison Selector in Waterfall mode */}
          {wfDisplayMode === 'waterfall' && (
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 self-start sm:self-auto">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-indigo-400" />
                Comparaison :
              </span>
              <select
                value={selectedCompWeek}
                onChange={(e) => setSelectedCompWeek(Number(e.target.value))}
                className="bg-slate-900 text-xs font-semibold text-white border border-slate-700 rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value={35}>S35 vs S34 (Semaine Actuelle)</option>
                <option value={34}>S34 vs S33</option>
                <option value={33}>S33 vs S32</option>
                <option value={32}>S32 vs S31</option>
                <option value={31}>S31 vs S30</option>
                <option value={30}>S30 vs S29</option>
              </select>
            </div>
          )}
        </div>

        {/* Prominent Diagnostic Card: Est-ce que le planning est reporté ou bien avancé ou bien non (stable) ? */}
        {wfDisplayMode === 'waterfall' && (
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 shadow-inner flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className={`p-2.5 rounded-xl border ${planningStatusInfo.badgeClass} flex items-center justify-center`}>
                {isPlanningReporte ? (
                  <Clock className="h-5 w-5 text-rose-400" />
                ) : isPlanningAvance ? (
                  <Zap className="h-5 w-5 text-emerald-400" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-sky-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded border ${planningStatusInfo.badgeClass}`}>
                    {planningStatusInfo.label}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    (Semaine S{selectedCompWeek} vs Semaine S{compWeekPrev})
                  </span>
                </div>
                <p className="text-sm font-semibold text-white mt-1">
                  {planningStatusInfo.summary}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {planningStatusInfo.recommendation}
                </p>
              </div>
            </div>

            {/* Quick Metrics Comparison */}
            <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4">
              <div className="text-center">
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">Besoin S{compWeekPrev}</span>
                <span className="text-base font-black font-mono text-sky-400">{baseWPrevQty} PF</span>
              </div>
              <span className="text-slate-600 font-mono text-xs">➔</span>
              <div className="text-center">
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">Besoin S{selectedCompWeek}</span>
                <span className="text-base font-black font-mono text-indigo-400">{finalNetPfQty} PF</span>
              </div>
              <div className="text-center pl-2 border-l border-slate-800/80">
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">Écart Net</span>
                <span className={`text-base font-black font-mono ${finalNetPfQty >= baseWPrevQty ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {finalNetPfQty >= baseWPrevQty ? `+${finalNetPfQty - baseWPrevQty}` : `${finalNetPfQty - baseWPrevQty}`} PF
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Top KPI Metrics Bar for Selected View */}
        {wfDisplayMode === 'weekly_demand' ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Total PF Demandé (PDP)</span>
              <span className="text-xl font-bold font-mono text-sky-400 mt-0.5">
                {totalWeeklyPfDemande} <span className="text-xs font-normal text-slate-400">PF</span>
              </span>
              <span className="text-[10px] text-slate-500">Sur les 10 dernières semaines</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">PF Déjà Livrés</span>
              <span className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                {totalWeeklyPfLivres} <span className="text-xs font-normal text-slate-400">PF</span>
              </span>
              <span className="text-[10px] text-emerald-400/80">
                {totalWeeklyPfDemande > 0 ? Math.round((totalWeeklyPfLivres / totalWeeklyPfDemande) * 100) : 0}% du besoin honoré
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">PF En Cours de Montage</span>
              <span className="text-xl font-bold font-mono text-cyan-400 mt-0.5">
                {totalWeeklyPfEnCours} <span className="text-xs font-normal text-slate-400">PF</span>
              </span>
              <span className="text-[10px] text-slate-500">En ligne d'assemblage</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">PF Bloqués / En Retard</span>
              <span className="text-xl font-bold font-mono text-rose-400 mt-0.5">
                {totalWeeklyPfRetards} <span className="text-xs font-normal text-slate-400">PF</span>
              </span>
              <span className="text-[10px] text-rose-400/80">Impactés par MSP ou qualité</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-[11px] bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-950/60 border border-sky-800 text-sky-300">
              <span className="h-2 w-2 rounded-full bg-sky-400" /> Besoin S{compWeekPrev} : {baseWPrevQty} PF
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> + Nouveaux : +{newPfQty} PF
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-800 text-cyan-300">
              <span className="h-2 w-2 rounded-full bg-cyan-400" /> + Avances : +{advancedPfQty} PF
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-800 text-amber-300">
              <span className="h-2 w-2 rounded-full bg-amber-400" /> - Reports : -{delayedPfQty} PF
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-950/60 border border-purple-800 text-purple-300">
              <span className="h-2 w-2 rounded-full bg-purple-400" /> - Bloqués : -{blockedPfQty} PF
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-950/60 border border-rose-800 text-rose-300">
              <span className="h-2 w-2 rounded-full bg-rose-400" /> - Livraisons PF : -{deliveredPfQty} PF
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-950/60 border border-indigo-800 text-indigo-300 font-bold ml-auto">
              <span className="h-2 w-2 rounded-full bg-indigo-400" /> = Besoin S{selectedCompWeek} : {finalNetPfQty} PF
            </span>
          </div>
        )}

        {/* CHART CONTAINER: AXE X = SEMAINES / AXE Y = NBR DE PF DEMANDE */}
        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {wfDisplayMode === 'weekly_demand' ? (
              <ComposedChart
                data={weeklyPfDemandData}
                margin={{ top: 20, right: 30, left: 10, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                <XAxis 
                  dataKey="week" 
                  stroke="#94a3b8" 
                  fontSize={11}
                  tickLine={false}
                  label={{ value: 'Semaines (Axe des Abscisses)', position: 'insideBottom', offset: -15, fill: '#94a3b8', fontSize: 11 }}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={11}
                  tickFormatter={(val) => `${val} PF`}
                  tickLine={false}
                  label={{ value: 'Nbr de PF Demandé (Axe des Ordonnées)', angle: -90, position: 'insideLeft', offset: 5, fill: '#94a3b8', fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 shadow-2xl text-xs space-y-2 font-sans min-w-[220px]">
                          <div className="font-bold text-white flex items-center justify-between border-b border-slate-800 pb-1.5">
                            <span className="text-sky-300">{item.weekLabel} / 2026</span>
                            <span className="text-[11px] font-mono text-slate-400">
                              {selectedWfProject === 'all' ? 'Tous Projets' : selectedWfProject.replace('Alstom ', '')}
                            </span>
                          </div>
                          <div className="space-y-1 font-mono">
                            <div className="flex justify-between items-center text-sky-400 font-bold">
                              <span>Nombre de PF Demandé :</span>
                              <span>{item.demandePf} PF</span>
                            </div>
                            <div className="flex justify-between items-center text-emerald-400">
                              <span>• Dont PF Livrés :</span>
                              <span>{item.livresPf} PF</span>
                            </div>
                            <div className="flex justify-between items-center text-cyan-400">
                              <span>• Dont PF En cours :</span>
                              <span>{item.enCoursPf} PF</span>
                            </div>
                            {item.retardPf > 0 && (
                              <div className="flex justify-between items-center text-amber-400">
                                <span>• Dont PF En retard :</span>
                                <span>{item.retardPf} PF</span>
                              </div>
                            )}
                            {item.bloquesPf > 0 && (
                              <div className="flex justify-between items-center text-rose-400">
                                <span>• Dont PF Bloqués :</span>
                                <span>{item.bloquesPf} PF</span>
                              </div>
                            )}
                          </div>
                          <div className="pt-1.5 border-t border-slate-800 flex justify-between text-[11px] text-slate-400">
                            <span>Taux d'adhérence :</span>
                            <span className="font-bold text-emerald-400 font-mono">{item.tauxServiceHebdo}%</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: 11, paddingTop: 12 }} 
                  formatter={(value) => <span className="text-slate-300 text-xs">{value}</span>}
                />
                <Bar 
                  dataKey="livresPf" 
                  name="PF Livrés aux Clients" 
                  fill="#10b981" 
                  stackId="pfDemand" 
                  radius={[0, 0, 0, 0]} 
                />
                <Bar 
                  dataKey="enCoursPf" 
                  name="PF En cours d'Assemblage" 
                  fill="#06b6d4" 
                  stackId="pfDemand" 
                  radius={[0, 0, 0, 0]} 
                />
                <Bar 
                  dataKey="retardPf" 
                  name="PF En retard" 
                  fill="#f59e0b" 
                  stackId="pfDemand" 
                  radius={[0, 0, 0, 0]} 
                />
                <Bar 
                  dataKey="bloquesPf" 
                  name="PF Bloqués (Manquants/Qualité)" 
                  fill="#f43f5e" 
                  stackId="pfDemand" 
                  radius={[4, 4, 0, 0]} 
                />
                <Line 
                  type="monotone" 
                  dataKey="demandePf" 
                  name="Total Demande PF (PDP)" 
                  stroke="#38bdf8" 
                  strokeWidth={2.5} 
                  dot={{ r: 4, fill: '#38bdf8' }} 
                  activeDot={{ r: 6, fill: '#7dd3fc' }}
                />
              </ComposedChart>
            ) : (
              <BarChart
                data={waterfallSteps}
                margin={{ top: 20, right: 30, left: 10, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />
                <XAxis 
                  dataKey="shortName" 
                  stroke="#94a3b8" 
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={11}
                  tickFormatter={(val) => `${val} PF`}
                  tickLine={false}
                  label={{ value: 'Quantité PF', angle: -90, position: 'insideLeft', offset: 5, fill: '#94a3b8', fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const step = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 shadow-2xl text-xs space-y-1">
                          <div className="font-bold text-white flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: step.color }} />
                            {step.name}
                          </div>
                          <p className="text-[11px] text-slate-400">{step.description}</p>
                          <div className="pt-1 border-t border-slate-800 flex justify-between gap-4 font-mono font-bold">
                            <span className="text-slate-300">Quantité Produit Fini (PF) :</span>
                            <span style={{ color: step.color }}>
                              {step.rawDelta > 0 && !step.isTotal ? `+${step.rawDelta.toLocaleString('fr-FR')}` : step.rawDelta.toLocaleString('fr-FR')} PF
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {/* Invisible spacer bar for floating effect */}
                <Bar dataKey="bottom" stackId="waterfall" fill="transparent" isAnimationActive={false} />
                {/* Colored delta/total bar */}
                <Bar dataKey="delta" stackId="waterfall" radius={[6, 6, 0, 0]}>
                  {waterfallSteps.map((entry, index) => (
                    <Cell key={`wf-cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Global Dashboard Charts Row 1: Weekly MSP Trend & Exception Messages Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: MSP Trend Area */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-rose-400" />
                Évolution Hebdomadaire des Pièces Manquantes (W28 - W35)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Suivi de la résorption des manquants et des références à risque d'arrêt de ligne
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('msp')}
              className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
            >
              Détail MSP <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyMspData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="globalMspGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs shadow-xl space-y-1 font-mono">
                          <div className="font-bold text-white">{data.week}</div>
                          <div className="text-rose-400 font-bold">Pièces manquantes : {data.pieces} pcs</div>
                          <div className="text-amber-400">Références critiques : {data.critical}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="pieces" 
                  stroke="#f43f5e" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#globalMspGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Exception Messages Donut */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-indigo-400" />
              Répartition des Messages d'Exception MRP
            </h3>
          </div>

          <div className="h-48 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={exceptionPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={68}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {exceptionPieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs shadow-xl font-mono">
                          <div className="font-bold text-white">{data.name}</div>
                          <div style={{ color: data.color }}>{data.value} ordres</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1 pt-2 border-t border-slate-800/80 text-xs">
            {exceptionPieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between py-0.5 px-2">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300 text-[11px]">{item.name}</span>
                </div>
                <span className="font-mono font-bold text-slate-200">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Global Dashboard Charts Row 2: Monthly OTIF vs Target & Order Book by Railway Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 3: OTIF Mensuel vs Cible 95% */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-400" />
                Performance OTIF Mensuelle vs Cible Contractuelle (95%)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Historique mensuel consolidé de janvier à août 2026
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('otif')}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
            >
              Average 3 Mois <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyOtifData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="globalOtifGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis domain={[80, 100]} stroke="#94a3b8" fontSize={10} tickLine={false} unit="%" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs shadow-xl font-mono">
                          <div className="font-bold text-white">{data.month}</div>
                          <div className="text-emerald-400">OTIF Global : {data.otif}%</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={95} stroke="#38bdf8" strokeDasharray="4 4" label={{ value: '95%', fill: '#38bdf8', fontSize: 10 }} />
                <Area type="monotone" dataKey="otif" stroke="#10b981" strokeWidth={2.5} fill="url(#globalOtifGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Order Book by Railway Program */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <TrainFront className="h-4 w-4 text-sky-400" />
                Carnet de Commandes Global par Programme Matériel Roulant
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Ventilation des volumes de composants planifiés par projet ferroviaire
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('mdp')}
              className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
            >
              Carnet MDP <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectOrderData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs shadow-xl font-mono">
                          <div className="font-bold text-white">{data.fullName}</div>
                          <div className="text-sky-400 font-bold">{data.quantity} pièces planifiées</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="quantity" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 5th Module: Suivi de Stock MP, FRS & Global Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 shadow-xl transition">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                  Nouveau Module 05
                </span>
                <h3 className="text-sm font-bold text-white">
                  Suivi de Stock (Material Planner, Fournisseurs & Global)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Pilotage des niveaux de stock, valorisation financière (€), détection des stocks dormants/obsolètes et surveillance des seuils mini/maxi par gestionnaire.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-4 bg-slate-950/70 border border-slate-800 px-4 py-2 rounded-xl text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Valeur Stock Global</span>
                <span className="font-bold text-amber-400 font-mono">
                  {totalStockValue > 0 ? (totalStockValue / 1000000).toFixed(2) : '2.84'} M€
                </span>
              </div>
              <div className="h-6 w-[1px] bg-slate-800" />
              <div>
                <span className="text-[10px] text-slate-400 block">Stock Dormant</span>
                <span className="font-bold text-rose-400 font-mono">
                  {totalDormantValue > 0 ? (totalDormantValue / 1000).toFixed(0) : '385'} k€
                </span>
              </div>
              <div className="h-6 w-[1px] bg-slate-800" />
              <div>
                <span className="text-[10px] text-slate-400 block">Alertes Stock Mini</span>
                <span className="font-bold text-white font-mono">
                  {stockAlertsCount || 8} réf.
                </span>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('stock')}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-amber-900/30 cursor-pointer"
            >
              <Package className="h-4 w-4" />
              <span>Ouvrir Module Stock</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Control Tower Central Section: Alerts & Actions + Pipeline Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: ALERTS & ACTIONS PRIORITY MATRIX */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Matrice des Alertes & Actions Prioritaires
              </h3>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-mono">
              4 actions urgentes identifiées
            </span>
          </div>

          <div className="space-y-3">
            {criticalActions.map((act) => (
              <div 
                key={act.id} 
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                      act.severity === 'Critique'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : act.severity === 'Majeur'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-sky-950 text-sky-300 border border-sky-800'
                    }`}>
                      {act.severity}
                    </span>
                    <h4 className="text-xs font-bold text-slate-100">{act.title}</h4>
                  </div>
                  <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
                    <span>Projet : <strong className="text-slate-200">{act.project}</strong></span>
                    <span>•</span>
                    <span>Fournisseur : <strong className="text-slate-200">{act.supplier}</strong></span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium">{act.impact}</p>
                </div>

                <div className="sm:text-right flex-shrink-0">
                  <span className="text-[11px] text-slate-400 block mb-1">Action recommandée :</span>
                  <span className="text-xs font-semibold text-sky-400 bg-sky-950/40 border border-sky-800/40 px-3 py-1.5 rounded-lg inline-block">
                    {act.recommendedAction}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: AUTO DATA SYNC PIPELINE SUMMARY */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-emerald-400" />
                Auto Data Sync (Dossiers Publics)
              </h3>
              <span className="text-xs font-mono text-emerald-400">Temps réel</span>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Dernier cycle de scan des 4 répertoires publics :
            </p>

            <div className="space-y-2.5">
              {folders.map((f) => (
                <div key={f.id} className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block">{f.code}</span>
                      <span className="text-[10px] text-slate-400 font-mono">Dernier : {f.latestPeriod}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-300 font-mono">✓ {f.fileCount} analysés</span>
                    <span className="text-[10px] text-slate-500 block">0 doublons</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={onOpenQualityModal}
              className="text-xs font-medium text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
            >
              Rapport d'ingestion & qualité
            </button>
            <button
              onClick={() => onNavigateTab('sources')}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
            >
              Explorer dossiers <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
