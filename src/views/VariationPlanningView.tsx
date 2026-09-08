import React, { useState } from 'react';
import { 
  GitCommit, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Layers, 
  Calendar, 
  Search, 
  Filter, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowRight,
  Zap,
  ShieldAlert,
  BarChart2,
  TrainFront
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell, 
  LineChart, 
  Line, 
  Legend, 
  ReferenceLine,
  ComposedChart
} from 'recharts';
import { MDPRecord, MSPRecord, PFRecord } from '../types';

interface VariationPlanningViewProps {
  mdpRecords: MDPRecord[];
  mspRecords: MSPRecord[];
  pfRecords: PFRecord[];
}

export const VariationPlanningView: React.FC<VariationPlanningViewProps> = ({
  mdpRecords,
  mspRecords,
  pfRecords
}) => {
  const [selectedHorizon, setSelectedHorizon] = useState<'4w' | '8w' | '12w'>('4w');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedCompWeek, setSelectedCompWeek] = useState<number>(35);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'waterfall' | 'weekly_demand'>('waterfall');

  // Filter records by project if selected
  const activeMdp = mdpRecords.filter(r => selectedProject === 'all' || r.project === selectedProject);
  const activePf = pfRecords.filter(r => selectedProject === 'all' || r.project === selectedProject);

  // --- Dynamic Waterfall Calculation: Semaine W vs Semaine W-1 par Projet & Quantités de PF ---
  const compWeekPrev = selectedCompWeek - 1;

  const prevWeekPfRecords = activePf.filter(r => r.week === compWeekPrev);
  const currWeekPfRecords = activePf.filter(r => r.week === selectedCompWeek);

  // Quantities for Week W-1 and Week W
  const baseWPrevQty = prevWeekPfRecords.reduce((acc, r) => acc + r.quantity, 0) || (selectedProject === 'all' ? 18 : 4);
  const baseWCurrQty = currWeekPfRecords.reduce((acc, r) => acc + r.quantity, 0) || (selectedProject === 'all' ? 16 : 3);

  // Breakdown of fluctuations between W-1 and W
  const newPfOrdersQty = currWeekPfRecords.filter(r => r.statusOF === 'Planifié').reduce((acc, r) => acc + r.quantity, 0) || 2;
  const advancedPfQty = Math.max(1, currWeekPfRecords.filter(r => r.statusOF === 'En cours').reduce((acc, r) => acc + r.quantity, 0) || 2);
  const delayedPfQty = Math.max(1, prevWeekPfRecords.filter(r => r.statusOF === 'En retard').reduce((acc, r) => acc + r.quantity, 0) || 3);
  const blockedPfQty = prevWeekPfRecords.filter(r => r.statusOF === 'Bloqué').reduce((acc, r) => acc + r.quantity, 0) || 1;
  const deliveredPfQty = prevWeekPfRecords.filter(r => r.statusOF === 'Livré').reduce((acc, r) => acc + (r.deliveredQuantity || r.quantity), 0) || Math.max(1, Math.round(baseWPrevQty * 0.3));

  // Mathematical closure for waterfall: Base W-1 + Nouveaux + Avances - Reports - Bloqués - Livrés = Net W
  const finalNetQty = Math.max(0, baseWPrevQty + newPfOrdersQty + advancedPfQty - delayedPfQty - blockedPfQty - deliveredPfQty);

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
    recommendation: `Besoin anticipé entre S${compWeekPrev} et S${selectedCompWeek}. Sécuriser immédiatement la disponibilité des composants critiques (MSP) et approvisionnements.`
  } : {
    label: 'PLANNING STABLE',
    badgeClass: 'bg-sky-950/80 border-sky-800 text-sky-300',
    iconColor: 'text-sky-400',
    summary: `Équilibre parfait des flux entre S${compWeekPrev} et S${selectedCompWeek} (${advancedPfQty} PF avancés = ${delayedPfQty} PF reportés).`,
    recommendation: `Le plan de production respecte le cadencement initial. Maintenir les allocations de kits composants.`
  };

  // Format Waterfall Data for Recharts Stacked Bar Trick
  const waterfallSteps = [
    {
      id: 'init',
      name: `Besoin PF Semaine S${compWeekPrev} (Base W-1)`,
      shortName: `Besoin S${compWeekPrev}`,
      rawDelta: baseWPrevQty,
      isTotal: true,
      color: '#38bdf8', // sky-400
      bottom: 0,
      delta: baseWPrevQty,
      description: `Besoin en Produits Finis planifié en semaine S${compWeekPrev} (${selectedProject === 'all' ? 'Tous programmes' : selectedProject})`
    },
    {
      id: 'new',
      name: `+ Nouveaux Ordres PF (PDP S${selectedCompWeek})`,
      shortName: '+ Nouveaux PF',
      rawDelta: newPfOrdersQty,
      isTotal: false,
      color: '#10b981', // emerald-500
      bottom: baseWPrevQty,
      delta: newPfOrdersQty,
      description: `Nouveaux ordres de fabrication PF intégrés au PDP en S${selectedCompWeek}`
    },
    {
      id: 'msg10',
      name: "+ Besoins PF Avancés (Anticipation)",
      shortName: '+ Avances PF',
      rawDelta: advancedPfQty,
      isTotal: false,
      color: '#06b6d4', // cyan-500
      bottom: baseWPrevQty + newPfOrdersQty,
      delta: advancedPfQty,
      description: `OF Produits Finis avancés de semaines futures vers S${selectedCompWeek}`
    },
    {
      id: 'msg15',
      name: '- Besoins PF Reportés (Décalages)',
      shortName: '- Reports PF',
      rawDelta: -delayedPfQty,
      isTotal: false,
      color: '#f59e0b', // amber-500
      bottom: Math.max(0, baseWPrevQty + newPfOrdersQty + advancedPfQty - delayedPfQty),
      delta: delayedPfQty,
      description: `Décalages de fabrication PF de S${compWeekPrev} vers des semaines ultérieures`
    },
    {
      id: 'msg20',
      name: '- PF Bloqués (Manquants/Qualité)',
      shortName: '- Bloqués PF',
      rawDelta: -blockedPfQty,
      isTotal: false,
      color: '#a855f7', // purple-500
      bottom: Math.max(0, baseWPrevQty + newPfOrdersQty + advancedPfQty - delayedPfQty - blockedPfQty),
      delta: blockedPfQty,
      description: 'Produits finis suspendus suite à pièces manquantes MSP ou anomalies qualité'
    },
    {
      id: 'pf_deliv',
      name: '- Livraisons PF Réalisées',
      shortName: '- Livrés PF',
      rawDelta: -deliveredPfQty,
      isTotal: false,
      color: '#f43f5e', // rose-500
      bottom: finalNetQty,
      delta: deliveredPfQty,
      description: `Produits finis assemblés, testés et livrés aux exploitants entre S${compWeekPrev} et S${selectedCompWeek}`
    },
    {
      id: 'final',
      name: `= Besoin Net PF Semaine S${selectedCompWeek} (Actif W)`,
      shortName: `Besoin S${selectedCompWeek}`,
      rawDelta: finalNetQty,
      isTotal: true,
      color: '#6366f1', // indigo-500
      bottom: 0,
      delta: finalNetQty,
      description: `Quantité nette de Produits Finis restants à livrer en semaine S${selectedCompWeek} (${selectedProject === 'all' ? 'Global' : selectedProject})`
    }
  ];

  // Weekly PF Demand Calculation (Axe X = Semaines, Axe Y = Nbr PF Demandé)
  const allWeeks = (Array.from(new Set(pfRecords.map((r) => r.week))) as number[]).sort((a, b) => a - b);
  const activeWeeks = allWeeks.slice(-10);

  const weeklyPfDemandData = activeWeeks.map((w) => {
    const wRecords = activePf.filter(r => r.week === w);
    const demandePf = wRecords.reduce((acc, r) => acc + r.quantity, 0);
    const livresPf = wRecords.filter(r => r.statusOF === 'Livré').reduce((acc, r) => acc + (r.deliveredQuantity || r.quantity), 0);
    const enCoursPf = wRecords.filter(r => r.statusOF === 'En cours' || r.statusOF === 'Planifié').reduce((acc, r) => acc + r.quantity, 0);
    const retardPf = wRecords.filter(r => r.statusOF === 'En retard').reduce((acc, r) => acc + r.quantity, 0);
    const bloquesPf = wRecords.filter(r => r.statusOF === 'Bloqué').reduce((acc, r) => acc + r.quantity, 0);

    return {
      week: `S${w}`,
      weekLabel: `Semaine ${w}`,
      weekNumber: w,
      demandePf, // Nbr de PF demandé (Y-axis)
      livresPf,
      enCoursPf,
      retardPf,
      bloquesPf,
      tauxService: demandePf > 0 ? Math.round((livresPf / demandePf) * 100) : 0
    };
  });

  const totalDemandePf = weeklyPfDemandData.reduce((acc, d) => acc + d.demandePf, 0);
  const totalLivresPf = weeklyPfDemandData.reduce((acc, d) => acc + d.livresPf, 0);

  // Nervousness / Volatility index
  const grossVariations = newPfOrdersQty + advancedPfQty + delayedPfQty + blockedPfQty;
  const churnRate = Math.round((grossVariations / Math.max(1, baseWPrevQty)) * 100);
  const netDelta = finalNetQty - baseWPrevQty;
  const netDeltaPercent = ((netDelta / Math.max(1, baseWPrevQty)) * 100).toFixed(1);

  // Weekly Planning Nervousness Trend (Simulation W28-W35)
  const nervousnessTrend = [
    { week: 'W28', base: 45, churn: 14.2, revisions: 6 },
    { week: 'W29', base: 48, churn: 16.8, revisions: 7 },
    { week: 'W30', base: 52, churn: 22.1, revisions: 9 },
    { week: 'W31', base: 50, churn: 18.5, revisions: 8 },
    { week: 'W32', base: 55, churn: 24.0, revisions: 11 },
    { week: 'W33', base: 58, churn: 19.8, revisions: 8 },
    { week: 'W34', base: 60, churn: 21.2, revisions: 10 },
    { week: 'W35', base: finalNetQty, churn: Number(churnRate), revisions: activePf.length }
  ];

  // Projects list from PF records
  const projectList = Array.from(new Set(pfRecords.map(r => r.project))) as string[];

  // Variation breakdown of Finished Products by project
  const projectVariations = projectList.map(proj => {
    const pRecords = pfRecords.filter(r => r.project === proj);
    const pDelivered = pRecords.filter(r => r.statusOF === 'Livré').reduce((a, b) => a + (b.deliveredQuantity || b.quantity), 0);
    const pDelayed = pRecords.filter(r => r.statusOF === 'En retard').reduce((a, b) => a + b.quantity, 0);
    const pBlocked = pRecords.filter(r => r.statusOF === 'Bloqué').reduce((a, b) => a + b.quantity, 0);
    const pPlanned = pRecords.filter(r => r.statusOF === 'Planifié' || r.statusOF === 'En cours').reduce((a, b) => a + b.quantity, 0);
    return {
      project: proj.replace('Alstom ', ''),
      fullName: proj,
      delivered: pDelivered,
      delayed: pDelayed,
      blocked: pBlocked,
      planned: pPlanned,
      total: pDelivered + pDelayed + pBlocked + pPlanned
    };
  });

  // Detailed PF Comparison between W-1 and W
  const pfFluctuationsList = activePf.map((pf) => {
    const isWPrev = pf.week === compWeekPrev;
    const isWCurr = pf.week === selectedCompWeek;
    let fluctuationType: 'Avancé' | 'Reporté' | 'Nouveau' | 'Livré' | 'Stable' = 'Stable';
    let rationale = 'Planning respecté et cadencé';

    if (pf.statusOF === 'En retard') {
      fluctuationType = 'Reporté';
      rationale = 'OF décalé suite à manque composants ou contrainte ligne';
    } else if (pf.statusOF === 'En cours' && isWCurr) {
      fluctuationType = 'Avancé';
      rationale = 'Fabrication anticipée pour sécuriser les jalons';
    } else if (pf.statusOF === 'Planifié' && isWCurr) {
      fluctuationType = 'Nouveau';
      rationale = 'Nouvel OF injecté dans le PDP semaine courante';
    } else if (pf.statusOF === 'Livré') {
      fluctuationType = 'Livré';
      rationale = 'Rame réceptionnée et expédiée au client';
    }

    return {
      ...pf,
      fluctuationType,
      rationale,
      qtyPrev: isWPrev ? pf.quantity : 0,
      qtyCurr: isWCurr ? pf.quantity : 0,
    };
  }).slice(0, 15);

  // Detailed variation items table
  const detailedChanges = activeMdp.filter(r => {
    const matchesSearch = 
      r.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.poNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }).slice(0, 20);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-96 bg-indigo-500/5 blur-3xl rounded-full pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase font-bold tracking-wider text-indigo-400 flex items-center gap-1.5">
                <BarChart2 className="h-3.5 w-3.5" />
                Analyse des Fluctuations de Planning (Waterfall S vs S-1)
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-slate-300 font-mono">
                Besoins en Produits Finis (PF) par Projet
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Fluctuations du Planning PDP : Semaine S{selectedCompWeek} vs S{compWeekPrev}
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Comparaison dynamique des besoins en Produits Finis entre la semaine <span className="text-sky-300 font-semibold">S{compWeekPrev}</span> et la semaine <span className="text-indigo-300 font-semibold">S{selectedCompWeek}</span> : diagnostic précis pour savoir si le planning de fabrication est <span className="text-rose-400 font-bold">reporté</span>, <span className="text-emerald-400 font-bold">avancé</span> ou <span className="text-sky-400 font-bold">stable</span>.
            </p>
          </div>

          {/* Filters controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Week Comparison Selector */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-2 py-1">
              <Clock className="h-3.5 w-3.5 text-indigo-400 mr-1.5" />
              <select
                value={selectedCompWeek}
                onChange={(e) => setSelectedCompWeek(Number(e.target.value))}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer pr-2"
              >
                <option value={35}>S35 vs S34</option>
                <option value={34}>S34 vs S33</option>
                <option value={33}>S33 vs S32</option>
                <option value={32}>S32 vs S31</option>
                <option value={31}>S31 vs S30</option>
              </select>
            </div>

            {/* Project filter */}
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">Tous les programmes</option>
              {projectList.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Prominent Diagnostic Card: Planning Reporté, Avancé ou Stable */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl border ${planningStatusInfo.badgeClass} flex items-center justify-center flex-shrink-0`}>
            {isPlanningReporte ? (
              <Clock className="h-6 w-6 text-rose-400" />
            ) : isPlanningAvance ? (
              <Zap className="h-6 w-6 text-emerald-400" />
            ) : (
              <CheckCircle2 className="h-6 w-6 text-sky-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded border ${planningStatusInfo.badgeClass}`}>
                {planningStatusInfo.label}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                (Comparaison S{selectedCompWeek} vs S{compWeekPrev} — {selectedProject === 'all' ? 'Tous Projets' : selectedProject})
              </span>
            </div>
            <p className="text-base font-bold text-white mt-1.5">
              {planningStatusInfo.summary}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              {planningStatusInfo.recommendation}
            </p>
          </div>
        </div>

        {/* Quick Fluctuation Metrics */}
        <div className="flex items-center gap-4 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 self-stretch lg:self-auto justify-around">
          <div className="text-center px-2">
            <span className="text-[10px] uppercase text-slate-400 font-semibold block">Besoin S{compWeekPrev}</span>
            <span className="text-lg font-black font-mono text-sky-400">{baseWPrevQty} PF</span>
          </div>
          <span className="text-slate-600 font-mono">➔</span>
          <div className="text-center px-2">
            <span className="text-[10px] uppercase text-slate-400 font-semibold block">Besoin S{selectedCompWeek}</span>
            <span className="text-lg font-black font-mono text-indigo-400">{finalNetQty} PF</span>
          </div>
          <div className="text-center px-3 border-l border-slate-800">
            <span className="text-[10px] uppercase text-slate-400 font-semibold block">Décalages Net</span>
            <span className={`text-lg font-black font-mono ${isPlanningReporte ? 'text-rose-400' : isPlanningAvance ? 'text-emerald-400' : 'text-sky-400'}`}>
              {isPlanningReporte ? `+${netShiftQty} Décalés` : isPlanningAvance ? `+${netShiftQty} Avancés` : '0 (Équilibré)'}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Besoin Initial W-1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <span className="text-xs text-slate-400 font-medium">Besoin PF Semaine S{compWeekPrev}</span>
          <div className="text-2xl font-black text-sky-400 font-mono mt-1">
            {baseWPrevQty} <span className="text-xs font-normal text-slate-400">PF</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Base de référence semaine W-1
          </span>
        </div>

        {/* Card 2: Besoins Avancés */}
        <div className="bg-slate-900 border border-cyan-900/40 bg-cyan-950/10 rounded-xl p-4 shadow-lg">
          <span className="text-xs text-cyan-400 font-medium">+ Besoins Avancés (Anticipation)</span>
          <div className="text-2xl font-black text-cyan-400 font-mono mt-1">
            +{advancedPfQty} <span className="text-xs font-normal text-cyan-300">PF</span>
          </div>
          <span className="text-[11px] text-cyan-400/70 mt-1 block">
            OF tirés vers l'amont en S{selectedCompWeek}
          </span>
        </div>

        {/* Card 3: Besoins Reportés */}
        <div className="bg-slate-900 border border-amber-900/40 bg-amber-950/10 rounded-xl p-4 shadow-lg">
          <span className="text-xs text-amber-400 font-medium">- Besoins Reportés (Décalages)</span>
          <div className="text-2xl font-black text-amber-400 font-mono mt-1">
            -{delayedPfQty} <span className="text-xs font-normal text-amber-300">PF</span>
          </div>
          <span className="text-[11px] text-amber-400/70 mt-1 block">
            OF décalés vers semaines futures
          </span>
        </div>

        {/* Card 4: Besoin Net S_W */}
        <div className="bg-slate-900 border border-indigo-900/40 bg-indigo-950/10 rounded-xl p-4 shadow-lg">
          <span className="text-xs text-indigo-400 font-medium">Besoin Net PF Semaine S{selectedCompWeek}</span>
          <div className="text-2xl font-black text-white font-mono mt-1">
            {finalNetQty} <span className="text-xs font-normal text-indigo-300">PF</span>
          </div>
          <div className="text-[11px] font-semibold mt-1 flex items-center gap-1">
            {netDelta >= 0 ? (
              <span className="text-emerald-400 flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" /> +{netDeltaPercent}% vs S{compWeekPrev}
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-0.5">
                <TrendingDown className="h-3 w-3" /> {netDeltaPercent}% vs S{compWeekPrev}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Chart Section: Semaines en Abscisses vs Nbr de PF demandé en Ordonnées & Waterfall PF */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-400 animate-pulse" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                {viewMode === 'waterfall'
                  ? `Waterfall des Fluctuations : S${selectedCompWeek} vs S${compWeekPrev} (Quantités de PF)`
                  : "Profil Hebdomadaire PDP — Semaines (Abscisses) vs Nombre de PF Demandé (Ordonnées)"}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {viewMode === 'waterfall'
                ? `Décomposition en cascade des variations de Produits Finis entre S${compWeekPrev} et S${selectedCompWeek} pour ${selectedProject === 'all' ? 'tous les programmes' : selectedProject}`
                : `Distribution hebdomadaire du besoin en Produits Finis (PF demandés, livrés et encours) pour ${selectedProject === 'all' ? 'l\'ensemble des programmes' : selectedProject}`}
            </p>
          </div>

          {/* Mode switch */}
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start lg:self-auto">
            <button
              onClick={() => setViewMode('waterfall')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'waterfall'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Vue Waterfall S vs S-1</span>
            </button>
            <button
              onClick={() => setViewMode('weekly_demand')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'weekly_demand'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Semaines vs Nbr PF</span>
            </button>
          </div>
        </div>

        {/* Color legend pills */}
        {viewMode === 'waterfall' ? (
          <div className="flex flex-wrap items-center gap-2 text-[11px] mb-4">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-950/60 border border-sky-800 text-sky-300">
              <span className="h-2 w-2 rounded-full bg-sky-400" /> Besoin S{compWeekPrev} : {baseWPrevQty} PF
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> + Nouveaux : +{newPfOrdersQty} PF
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
              <span className="h-2 w-2 rounded-full bg-indigo-400" /> = Besoin S{selectedCompWeek} : {finalNetQty} PF
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-[11px] mb-4">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-950/60 border border-sky-800 text-sky-300">
              <span className="h-2 w-2 rounded-full bg-sky-400" /> Total Demandé : {totalDemandePf} PF
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Livrés : {totalLivresPf} PF
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-800 text-cyan-300">
              <span className="h-2 w-2 rounded-full bg-cyan-400" /> En cours : {weeklyPfDemandData.reduce((a, b) => a + b.enCoursPf, 0)} PF
            </span>
          </div>
        )}

        {/* Chart via Recharts */}
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === 'weekly_demand' ? (
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
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 shadow-2xl text-xs space-y-1.5 font-sans">
                          <div className="font-bold text-white flex items-center justify-between border-b border-slate-800 pb-1">
                            <span className="text-indigo-300">{item.weekLabel} / 2026</span>
                            <span className="text-[11px] font-mono text-slate-400">
                              {selectedProject === 'all' ? 'Tous Projets' : selectedProject.replace('Alstom ', '')}
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
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                  formatter={(value) => <span className="text-slate-300 text-xs">{value}</span>}
                />
                <Bar 
                  dataKey="livresPf" 
                  name="PF Livrés aux Clients" 
                  fill="#10b981" 
                  stackId="pf" 
                  radius={[0, 0, 0, 0]} 
                />
                <Bar 
                  dataKey="enCoursPf" 
                  name="PF En cours d'Assemblage" 
                  fill="#06b6d4" 
                  stackId="pf" 
                  radius={[0, 0, 0, 0]} 
                />
                <Bar 
                  dataKey="retardPf" 
                  name="PF En retard" 
                  fill="#f59e0b" 
                  stackId="pf" 
                  radius={[0, 0, 0, 0]} 
                />
                <Bar 
                  dataKey="bloquesPf" 
                  name="PF Bloqués" 
                  fill="#f43f5e" 
                  stackId="pf" 
                  radius={[4, 4, 0, 0]} 
                />
                <Line 
                  type="monotone" 
                  dataKey="demandePf" 
                  name="Total Demande PF (PDP)" 
                  stroke="#818cf8" 
                  strokeWidth={2.5} 
                  dot={{ r: 4, fill: '#818cf8' }} 
                />
              </ComposedChart>
            ) : (
              <BarChart
                data={waterfallSteps}
                margin={{ top: 20, right: 30, left: 10, bottom: 35 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />
                <XAxis 
                  dataKey="shortName" 
                  stroke="#94a3b8" 
                  fontSize={11}
                  tickLine={false}
                  angle={-10}
                  textAnchor="end"
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
                {/* The invisible spacer bar */}
                <Bar dataKey="bottom" stackId="waterfall" fill="transparent" isAnimationActive={false} />
                {/* The actual colored delta/total bar */}
                <Bar dataKey="delta" stackId="waterfall" radius={[6, 6, 0, 0]}>
                  {waterfallSteps.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Step details strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mt-6 pt-6 border-t border-slate-800/80 text-xs">
          {waterfallSteps.map((step) => (
            <div key={step.id} className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: step.color }} />
                <span className="text-[10px] font-bold text-slate-300 truncate">{step.shortName}</span>
              </div>
              <div className="font-mono font-black text-slate-100 text-sm">
                {step.rawDelta > 0 && !step.isTotal ? `+${step.rawDelta.toLocaleString('fr-FR')}` : step.rawDelta.toLocaleString('fr-FR')} <span className="text-[10px] font-normal text-slate-400">PF</span>
              </div>
              <span className="text-[9px] text-slate-500 block truncate">{step.description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Fluctuation Details: Table des Produits Finis (PF) S vs S-1 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <TrainFront className="h-4 w-4 text-sky-400" />
              Détail des Fluctuations par Produit Fini (PF) — S{selectedCompWeek} vs S{compWeekPrev}
            </h3>
            <p className="text-[11px] text-slate-400">
              Suivi unitaire des rames, motrices et sous-ensembles PF : statut d'avancement, report ou stabilité
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Statut Fluctuation</th>
                <th className="px-4 py-3">Réf Produit Fini</th>
                <th className="px-4 py-3">Désignation</th>
                <th className="px-4 py-3">Projet & Client</th>
                <th className="px-4 py-3">Besoin S{compWeekPrev}</th>
                <th className="px-4 py-3">Besoin S{selectedCompWeek}</th>
                <th className="px-4 py-3">Quantité PF</th>
                <th className="px-4 py-3">Diagnostic & Action Recommandée</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {pfFluctuationsList.map((pf) => {
                const isReporte = pf.fluctuationType === 'Reporté';
                const isAvance = pf.fluctuationType === 'Avancé';
                const isNouveau = pf.fluctuationType === 'Nouveau';
                const isLivre = pf.fluctuationType === 'Livré';

                return (
                  <tr key={pf.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3">
                      {isReporte && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                          <Clock className="h-3 w-3" />
                          Reporté
                        </span>
                      )}
                      {isAvance && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                          <Zap className="h-3 w-3" />
                          Avancé
                        </span>
                      )}
                      {isNouveau && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          <TrendingUp className="h-3 w-3" />
                          Nouveau
                        </span>
                      )}
                      {isLivre && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                          <CheckCircle2 className="h-3 w-3" />
                          Livré
                        </span>
                      )}
                      {!isReporte && !isAvance && !isNouveau && !isLivre && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300">
                          <CheckCircle2 className="h-3 w-3 text-sky-400" />
                          Stable
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-sky-400">
                      {pf.reference}
                    </td>
                    <td className="px-4 py-3 text-slate-200 font-medium">
                      {pf.designation}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      <div className="font-semibold text-slate-200">{pf.project.replace('Alstom ', '')}</div>
                      <div className="text-[10px] text-slate-500">{pf.client}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300">
                      {pf.week === compWeekPrev ? `${pf.quantity} PF` : '-'}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-indigo-300">
                      {pf.week === selectedCompWeek ? `${pf.quantity} PF` : '-'}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-white">
                      {pf.quantity} PF
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      <span className="text-xs font-medium block">
                        {pf.rationale}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Secondary Graphs: Nervousness Trend & Project Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graph 1: Planning Nervousness & Churn Trend */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-400" />
                Taux de Nervosité du Planning (%) — Historique Hebdomadaire
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Évolution de la volatilité hebdomadaire (recommandation lean: maintenir &lt; 20%)
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded">
              W35 : {churnRate}%
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={nervousnessTrend} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} unit="%" domain={[10, 30]} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs shadow-xl font-mono">
                          <div className="font-bold text-indigo-300">{data.week}</div>
                          <div className="text-amber-400">Nervosité : {data.churn}%</div>
                          <div className="text-slate-400">Ordres révisés : {data.revisions} PF</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={20} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Seuil Max 20%', fill: '#ef4444', fontSize: 10 }} />
                <Line 
                  type="monotone" 
                  dataKey="churn" 
                  stroke="#6366f1" 
                  strokeWidth={2.5} 
                  dot={{ r: 4, fill: '#6366f1' }}
                  activeDot={{ r: 6, fill: '#a5b4fc' }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 2: Project Breakdown Stacked */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-400" />
                Statut des Produits Finis par Projet (PF)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Ventilation des rames et sous-ensembles livrés, en retard, bloqués et planifiés par projet
              </p>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectVariations} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="project" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} tickFormatter={(val) => `${val} PF`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs shadow-xl space-y-1">
                          <div className="font-bold text-white">{label}</div>
                          <div className="text-emerald-400">Livrés : {payload[0]?.value} PF</div>
                          <div className="text-amber-400">En retard : {payload[1]?.value} PF</div>
                          <div className="text-purple-400">Bloqués : {payload[2]?.value} PF</div>
                          <div className="text-sky-400">En cours / Planifiés : {payload[3]?.value} PF</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 6 }} />
                <Bar dataKey="delivered" name="Livrés" fill="#10b981" stackId="p" radius={[0, 0, 0, 0]} />
                <Bar dataKey="delayed" name="En retard" fill="#f59e0b" stackId="p" radius={[0, 0, 0, 0]} />
                <Bar dataKey="blocked" name="Bloqués" fill="#a855f7" stackId="p" radius={[0, 0, 0, 0]} />
                <Bar dataKey="planned" name="En cours / Planifiés" fill="#38bdf8" stackId="p" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Variations Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Journal des Variations & Recommandations Approvisionnement
            </h3>
            <p className="text-[11px] text-slate-500">
              Lignes de besoins affectées par un Message d'Exception (10, 15, 20)
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrer réf, fournisseur, PO..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Message MRP</th>
                <th className="px-4 py-3">Référence & PO</th>
                <th className="px-4 py-3">Fournisseur</th>
                <th className="px-4 py-3">Projet</th>
                <th className="px-4 py-3">Need Date</th>
                <th className="px-4 py-3">Date Confirmée</th>
                <th className="px-4 py-3">Qté (pcs)</th>
                <th className="px-4 py-3">Action Recommandée Approvisionneur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {detailedChanges.map((r) => {
                const isMsg10 = r.exceptionCode === '10';
                const isMsg15 = r.exceptionCode === '15';
                const isMsg20 = r.exceptionCode === '20';

                return (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3">
                      {isMsg10 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                          <Zap className="h-3 w-3" />
                          Msg 10 : Avancement
                        </span>
                      )}
                      {isMsg15 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                          <Clock className="h-3 w-3" />
                          Msg 15 : Report
                        </span>
                      )}
                      {isMsg20 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                          <XCircle className="h-3 w-3" />
                          Msg 20 : À Annuler
                        </span>
                      )}
                      {!isMsg10 && !isMsg15 && !isMsg20 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300">
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                          Conforme
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-sky-400">{r.reference}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{r.poNumber}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-200 font-medium">
                      {r.supplier}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {r.project}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300">
                      {r.needDate || (
                        <span className="text-rose-400 italic font-bold">AUCUNE (Msg 20)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {r.confirmedDate ? (
                        <span className="text-slate-200">{r.confirmedDate}</span>
                      ) : (
                        <span className="text-slate-500 italic">Non confirmée</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-100">
                      {r.quantity}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-300 font-medium block">
                        {r.exceptionAction || 'Suivi standard du carnet de commandes'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
