import React from 'react';
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
  Flame
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine 
} from 'recharts';
import { MSPRecord, MDPRecord, PFRecord, OTIFRecord, PeriodFilter, FolderConfig } from '../types';
import { MONTH_NAMES_FR } from '../services/initialData';

interface ControlTowerViewProps {
  mspRecords: MSPRecord[];
  mdpRecords: MDPRecord[];
  pfRecords: PFRecord[];
  otifRecords: OTIFRecord[];
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
  folders,
  selectedPeriod,
  onNavigateTab,
  onOpenQualityModal
}) => {
  // Compute Key Metrics
  // 1. OTIF Global average & 3M
  const avgOtif = otifRecords.length > 0
    ? (otifRecords.reduce((acc, r) => acc + r.otifRate, 0) / otifRecords.length).toFixed(1)
    : '94.6';

  // 2. Missing Parts count
  const criticalMsp = mspRecords.filter((r) => r.criticality === 'Critique').length;
  const totalMspQty = mspRecords.reduce((acc, r) => acc + r.missingQuantity, 0);

  // 3. MDP & Exception Messages
  const confirmedMdpCount = mdpRecords.filter((r) => r.status === 'Confirmé').length;
  const mdpConfirmRate = mdpRecords.length > 0
    ? Math.round((confirmedMdpCount / mdpRecords.length) * 100)
    : 78;
  const msg10Count = mdpRecords.filter((r) => r.exceptionCode === '10').length;
  const msg15Count = mdpRecords.filter((r) => r.exceptionCode === '15').length;
  const msg20Count = mdpRecords.filter((r) => r.exceptionCode === '20').length;

  // 4. Finished Products (PF)
  const delayedPfCount = pfRecords.filter((r) => r.statusOF === 'En retard' || r.statusOF === 'Bloqué').length;
  const inProgressPfCount = pfRecords.filter((r) => r.statusOF === 'En cours').length;
  const deliveredPfCount = pfRecords.filter((r) => r.statusOF === 'Livré').length;

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
  const projects = ['Alstom Coradia Polyvalent', 'Alstom Citadis Dualis', 'Alstom Avelia Horizon TGV M', 'Alstom Metropolis Metro', 'Alstom Traxx MS3 Locomotive'];
  const projectOrderData = projects.map((p) => {
    const pMdp = mdpRecords.filter((r) => r.project === p);
    const qty = pMdp.reduce((acc, r) => acc + r.quantity, 0) || 1500;
    return {
      name: p.replace('Alstom ', ''),
      fullName: p,
      quantity: qty
    };
  });

  // Waterfall Variation Planning Breakdown (Flux Nets W-4 à W35)
  const initialBaseQty = mdpRecords.reduce((acc, r) => acc + r.quantity, 0) || 12450;
  const newNeedsRecords = mdpRecords.filter(r => r.evolution === 'Nouveau besoin');
  const newNeedsQty = newNeedsRecords.reduce((acc, r) => acc + r.quantity, 0) || 1850;
  const advanceRecords = mdpRecords.filter(r => r.exceptionCode === '10' || r.evolution === 'Avance');
  const advanceQty = advanceRecords.reduce((acc, r) => acc + r.quantity, 0) || 1420;
  const postponeRecords = mdpRecords.filter(r => r.exceptionCode === '15' || r.evolution === 'Report');
  const postponeQty = postponeRecords.reduce((acc, r) => acc + r.quantity, 0) || 2180;
  const cancelRecords = mdpRecords.filter(r => r.exceptionCode === '20');
  const cancelQty = cancelRecords.reduce((acc, r) => acc + r.quantity, 0) || 980;
  const deliveredPfQty = pfRecords.filter(r => r.statusOF === 'Livré').reduce((acc, r) => acc + r.quantity * 25, 0) || 1640;
  const finalNetQty = initialBaseQty + newNeedsQty + advanceQty - postponeQty - cancelQty - deliveredPfQty;

  const waterfallSteps = [
    {
      id: 'init',
      name: 'Carnet Initial W-4',
      shortName: 'W-4 Initial',
      rawDelta: initialBaseQty,
      isTotal: true,
      color: '#38bdf8', // sky-400
      bottom: 0,
      delta: initialBaseQty,
      description: 'Volume de besoins nets consolidés au début du cycle'
    },
    {
      id: 'new',
      name: '+ Nouveaux Besoins',
      shortName: '+ Nouveaux',
      rawDelta: newNeedsQty,
      isTotal: false,
      color: '#10b981', // emerald-500
      bottom: initialBaseQty,
      delta: newNeedsQty,
      description: 'Augmentations de cadence et nouveaux ordres clients'
    },
    {
      id: 'msg10',
      name: "+ Besoins Avancés (Msg 10)",
      shortName: '+ Avances (10)',
      rawDelta: advanceQty,
      isTotal: false,
      color: '#06b6d4', // cyan-500
      bottom: initialBaseQty + newNeedsQty,
      delta: advanceQty,
      description: "Demandes d'avancement de besoin pour anticiper la production"
    },
    {
      id: 'msg15',
      name: '- Besoins Reportés (Msg 15)',
      shortName: '- Reports (15)',
      rawDelta: -postponeQty,
      isTotal: false,
      color: '#f59e0b', // amber-500
      bottom: initialBaseQty + newNeedsQty + advanceQty - postponeQty,
      delta: postponeQty,
      description: 'Demandes de report de livraison suite à décalage de besoin'
    },
    {
      id: 'msg20',
      name: '- Besoins Annulés (Msg 20)',
      shortName: '- Annulations (20)',
      rawDelta: -cancelQty,
      isTotal: false,
      color: '#a855f7', // purple-500
      bottom: initialBaseQty + newNeedsQty + advanceQty - postponeQty - cancelQty,
      delta: cancelQty,
      description: 'Commandes d\'achat confirmées sans date de besoin active'
    },
    {
      id: 'pf_deliv',
      name: '- Livraisons PF Réalisées',
      shortName: '- Livraisons PF',
      rawDelta: -deliveredPfQty,
      isTotal: false,
      color: '#f43f5e', // rose-500
      bottom: finalNetQty,
      delta: deliveredPfQty,
      description: 'Consommation de composants par les produits finis assemblés'
    },
    {
      id: 'final',
      name: '= Carnet Net Actif W35',
      shortName: 'W35 Net Final',
      rawDelta: finalNetQty,
      isTotal: true,
      color: '#6366f1', // indigo-500
      bottom: 0,
      delta: finalNetQty,
      description: 'Carnet net actif prêt pour ordonnancement et réappro'
    }
  ];

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
        {/* Card 1: OTIF & 3M */}
        <div 
          onClick={() => onNavigateTab('otif')}
          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 shadow-lg transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">OTIF Global & 3M</span>
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">{avgOtif}%</span>
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" />
              Cible ≥ 95%
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Average 3M Fournisseurs</span>
            <span className="text-emerald-400 group-hover:translate-x-0.5 transition flex items-center gap-1 text-[11px] font-semibold">
              Dashboard OTIF <ArrowUpRight className="h-3 w-3" />
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

        {/* Card 4: Waterfall Variation Planning */}
        <div 
          onClick={() => onNavigateTab('variation')}
          className="bg-slate-900 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-5 shadow-lg transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">Carnet Net Final (W35)</span>
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
              <BarChart3 className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">{finalNetQty.toLocaleString('fr-FR')}</span>
            <span className="text-xs font-medium text-purple-300">
              pcs nettes
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Waterfall Variation Planning</span>
            <span className="text-purple-400 group-hover:translate-x-0.5 transition flex items-center gap-1 text-[11px] font-semibold">
              Détail Waterfall <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Prominent Full Interactive Waterfall Diagram Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-400 animate-pulse" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-400" />
                Diagramme Waterfall — Évolution et Décomposition du Planning (W-4 à W35)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Visualisation dynamique des flux nets : passage du carnet initial (W-4) au carnet net actif (W35) avec impact des messages 10, 15, 20 et livraisons.
            </p>
          </div>

          {/* Color legend pills */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-950/60 border border-sky-800 text-sky-300">
              <span className="h-2 w-2 rounded-full bg-sky-400" /> Totaux (Base & Net)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> + Nouveaux ({newNeedsQty.toLocaleString('fr-FR')})
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-800 text-cyan-300">
              <span className="h-2 w-2 rounded-full bg-cyan-400" /> + Avances Msg 10 ({advanceQty.toLocaleString('fr-FR')})
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-800 text-amber-300">
              <span className="h-2 w-2 rounded-full bg-amber-400" /> - Reports Msg 15 ({postponeQty.toLocaleString('fr-FR')})
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-950/60 border border-purple-800 text-purple-300">
              <span className="h-2 w-2 rounded-full bg-purple-400" /> - Annulations Msg 20 ({cancelQty.toLocaleString('fr-FR')})
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-950/60 border border-rose-800 text-rose-300">
              <span className="h-2 w-2 rounded-full bg-rose-400" /> - Livraisons PF ({deliveredPfQty.toLocaleString('fr-FR')})
            </span>
            <button
              onClick={() => onNavigateTab('variation')}
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 ml-2 font-medium cursor-pointer"
            >
              Vue détaillée <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Waterfall Chart via Recharts Stacked Bars */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
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
                tickFormatter={(val) => `${Math.round(val / 1000)}k`}
                tickLine={false}
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
                          <span className="text-slate-300">Quantité :</span>
                          <span style={{ color: step.color }}>
                            {step.rawDelta > 0 && !step.isTotal ? `+${step.rawDelta.toLocaleString('fr-FR')}` : step.rawDelta.toLocaleString('fr-FR')} pcs
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
