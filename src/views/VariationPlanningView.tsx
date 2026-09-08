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
  BarChart2
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
  ReferenceLine 
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
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Filter records by project if selected
  const activeMdp = mdpRecords.filter(r => selectedProject === 'all' || r.project === selectedProject);
  const activePf = pfRecords.filter(r => selectedProject === 'all' || r.project === selectedProject);

  // Compute Waterfall Metrics based on active records
  // Baseline initial demand
  const initialBaseQty = activeMdp.reduce((acc, r) => acc + r.quantity, 0) || 12450;
  const initialBaseCount = activeMdp.length || 180;

  // 1. Nouveaux besoins (+ MRP demand)
  const newNeedsRecords = activeMdp.filter(r => r.evolution === 'Nouveau besoin');
  const newNeedsQty = newNeedsRecords.reduce((acc, r) => acc + r.quantity, 0) || 1850;

  // 2. Besoins avancés (+ Msg 10 Demande d'avancement)
  const advanceRecords = activeMdp.filter(r => r.exceptionCode === '10' || r.evolution === 'Avance');
  const advanceQty = advanceRecords.reduce((acc, r) => acc + r.quantity, 0) || 1420;

  // 3. Besoins reportés (- Msg 15 Demande de report)
  const postponeRecords = activeMdp.filter(r => r.exceptionCode === '15' || r.evolution === 'Report');
  const postponeQty = postponeRecords.reduce((acc, r) => acc + r.quantity, 0) || 2180;

  // 4. Besoins annulés (- Msg 20 Commandes sans Need Date)
  const cancelRecords = activeMdp.filter(r => r.exceptionCode === '20');
  const cancelQty = cancelRecords.reduce((acc, r) => acc + r.quantity, 0) || 980;

  // 5. Livraisons PF réalisées (- Consommation / Sortie)
  const deliveredPfQty = activePf.filter(r => r.statusOF === 'Livré').reduce((acc, r) => acc + r.quantity * 25, 0) || 1640;

  // Final Net Order Book
  const finalNetQty = initialBaseQty + newNeedsQty + advanceQty - postponeQty - cancelQty - deliveredPfQty;

  // Format Waterfall Data for Recharts Stacked Bar Trick:
  // Invisible bar "bottom" + Visible bar "delta"
  let runningTotal = 0;
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
      description: 'Planning actif net en cours d\'exécution'
    }
  ];

  // Nervousness / Volatility index
  const grossVariations = newNeedsQty + advanceQty + postponeQty + cancelQty;
  const churnRate = Math.round((grossVariations / initialBaseQty) * 100);
  const netDelta = finalNetQty - initialBaseQty;
  const netDeltaPercent = ((netDelta / initialBaseQty) * 100).toFixed(1);

  // Weekly Planning Nervousness Trend (Simulation W28-W35)
  const nervousnessTrend = [
    { week: 'W28', base: 11200, churn: 14.2, revisions: 38 },
    { week: 'W29', base: 11500, churn: 16.8, revisions: 44 },
    { week: 'W30', base: 11900, churn: 22.1, revisions: 62 },
    { week: 'W31', base: 11750, churn: 18.5, revisions: 51 },
    { week: 'W32', base: 12100, churn: 25.4, revisions: 74 },
    { week: 'W33', base: 12300, churn: 19.8, revisions: 58 },
    { week: 'W34', base: 12200, churn: 21.2, revisions: 64 },
    { week: 'W35', base: finalNetQty, churn: Number(churnRate), revisions: activeMdp.length }
  ];

  // Projects list
  const projectList = Array.from(new Set(mdpRecords.map(r => r.project))) as string[];

  // Variation breakdown by project
  const projectVariations = projectList.map(proj => {
    const pRecords = mdpRecords.filter(r => r.project === proj);
    const pAdvances = pRecords.filter(r => r.exceptionCode === '10' || r.evolution === 'Avance').reduce((a, b) => a + b.quantity, 0);
    const pPostpones = pRecords.filter(r => r.exceptionCode === '15' || r.evolution === 'Report').reduce((a, b) => a + b.quantity, 0);
    const pCancels = pRecords.filter(r => r.exceptionCode === '20').reduce((a, b) => a + b.quantity, 0);
    const pStable = pRecords.filter(r => r.evolution === 'Stable').reduce((a, b) => a + b.quantity, 0);
    return {
      project: proj.replace('Alstom ', ''),
      fullName: proj,
      advances: pAdvances,
      postpones: pPostpones,
      cancels: pCancels,
      stable: pStable,
      total: pAdvances + pPostpones + pCancels + pStable
    };
  });

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
                Dashboard Variation Planning & Churn
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-slate-300 font-mono">
                Modèle Waterfall Dynamique Multi-Semaines
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Analyse Waterfall des Mouvements de Planning
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Visualisation en cascade des écarts nets entre le carnet de départ et le carnet actif actuel : intégration des nouveaux besoins, des avances (Message 10), des reports (Message 15), des annulations (Message 20) et des expéditions de Produits Finis.
            </p>
          </div>

          {/* Filters controls */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="all">Tous les programmes</option>
              {projectList.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
              <button
                onClick={() => setSelectedHorizon('4w')}
                className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                  selectedHorizon === '4w' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                4 Semaines
              </button>
              <button
                onClick={() => setSelectedHorizon('8w')}
                className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                  selectedHorizon === '8w' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                8 Semaines
              </button>
              <button
                onClick={() => setSelectedHorizon('12w')}
                className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                  selectedHorizon === '12w' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                12 Semaines
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Carnet Initial */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <span className="text-xs text-slate-400 font-medium">Carnet Initial (W-4)</span>
          <div className="text-2xl font-black text-sky-400 font-mono mt-1">
            {initialBaseQty.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-400">pcs</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Base de référence consolidée
          </span>
        </div>

        {/* Card 2: Variations Brutes */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <span className="text-xs text-amber-400 font-medium">Volatilité / Churn Planning</span>
          <div className="text-2xl font-black text-amber-400 font-mono mt-1">
            {churnRate}%
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {grossVariations.toLocaleString('fr-FR')} pcs modifiées
          </span>
        </div>

        {/* Card 3: Annulations (Message 20) */}
        <div className="bg-slate-900 border border-purple-900/40 bg-purple-950/10 rounded-xl p-4 shadow-lg">
          <span className="text-xs text-purple-400 font-medium">Besoin à Annuler (Msg 20)</span>
          <div className="text-2xl font-black text-purple-400 font-mono mt-1">
            {cancelQty.toLocaleString('fr-FR')} <span className="text-xs font-normal text-purple-300">pcs</span>
          </div>
          <span className="text-[11px] text-purple-300/70 mt-1 block">
            Date confirmée sans Need Date
          </span>
        </div>

        {/* Card 4: Carnet Net Final */}
        <div className="bg-slate-900 border border-indigo-900/40 bg-indigo-950/10 rounded-xl p-4 shadow-lg">
          <span className="text-xs text-indigo-400 font-medium">Carnet Net Actif (W35)</span>
          <div className="text-2xl font-black text-white font-mono mt-1">
            {finalNetQty.toLocaleString('fr-FR')} <span className="text-xs font-normal text-indigo-300">pcs</span>
          </div>
          <div className="text-[11px] font-semibold mt-1 flex items-center gap-1">
            {netDelta >= 0 ? (
              <span className="text-emerald-400 flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" /> +{netDeltaPercent}% vs W-4
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-0.5">
                <TrendingDown className="h-3 w-3" /> {netDeltaPercent}% vs W-4
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Waterfall Chart Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-400 animate-pulse" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Diagramme Waterfall — Évolution et Décomposition du Planning
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Visualisation des flux cumulés nets menant du carnet initial au carnet actif net
            </p>
          </div>

          {/* Color legend pills */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-950/60 border border-sky-800 text-sky-300">
              <span className="h-2 w-2 rounded-full bg-sky-400" /> Totaux (Base & Net)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> + Nouveaux besoins
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-800 text-cyan-300">
              <span className="h-2 w-2 rounded-full bg-cyan-400" /> + Avances (Msg 10)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-800 text-amber-300">
              <span className="h-2 w-2 rounded-full bg-amber-400" /> - Reports (Msg 15)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-950/60 border border-purple-800 text-purple-300">
              <span className="h-2 w-2 rounded-full bg-purple-400" /> - Annulations (Msg 20)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-950/60 border border-rose-800 text-rose-300">
              <span className="h-2 w-2 rounded-full bg-rose-400" /> - Livraisons PF
            </span>
          </div>
        </div>

        {/* Waterfall Chart via Recharts Stacked Bars */}
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
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
              {/* The invisible spacer bar */}
              <Bar dataKey="bottom" stackId="waterfall" fill="transparent" isAnimationActive={false} />
              {/* The actual colored delta/total bar */}
              <Bar dataKey="delta" stackId="waterfall" radius={[6, 6, 0, 0]}>
                {waterfallSteps.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
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
                {step.rawDelta > 0 && !step.isTotal ? `+${step.rawDelta.toLocaleString('fr-FR')}` : step.rawDelta.toLocaleString('fr-FR')}
              </div>
              <span className="text-[9px] text-slate-500 block truncate">{step.description}</span>
            </div>
          ))}
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
                          <div className="text-slate-400">Révisions : {data.revisions} lignes</div>
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
                Mouvements de Planning par Programme / Projet
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Ventilation des avances, reports et annulations par projet
              </p>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectVariations} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="project" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs shadow-xl space-y-1">
                          <div className="font-bold text-white">{label}</div>
                          <div className="text-cyan-400">Avances (Msg 10) : {payload[0]?.value} pcs</div>
                          <div className="text-amber-400">Reports (Msg 15) : {payload[1]?.value} pcs</div>
                          <div className="text-purple-400">Annulations (Msg 20) : {payload[2]?.value} pcs</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 6 }} />
                <Bar dataKey="advances" name="Avances (10)" fill="#06b6d4" stackId="p" radius={[0, 0, 0, 0]} />
                <Bar dataKey="postpones" name="Reports (15)" fill="#f59e0b" stackId="p" radius={[0, 0, 0, 0]} />
                <Bar dataKey="cancels" name="Annulations (20)" fill="#a855f7" stackId="p" radius={[4, 4, 0, 0]} />
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
