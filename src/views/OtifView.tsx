import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  AlertTriangle, 
  FolderOpen, 
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine, 
  Cell, 
  Legend 
} from 'recharts';
import { OTIFRecord, PublicFileMetadata } from '../types';
import { MONTH_NAMES_FR } from '../services/initialData';

interface OtifViewProps {
  records: OTIFRecord[];
  files: PublicFileMetadata[];
  onOpenFolderModal: () => void;
}

export const OtifView: React.FC<OtifViewProps> = ({
  records,
  files,
  onOpenFolderModal
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSupplierView, setSelectedSupplierView] = useState<'all' | 'compliant' | 'warning' | 'critical'>('all');

  const otifFiles = files.filter((f) => f.folderKey === 'otif');

  // Filter records
  const filteredRecords = records.filter((r) => {
    const matchesSearch = r.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMonth = selectedMonth === 'all' || r.month.toString() === selectedMonth;
    const matchesCategory = selectedCategory === 'all' || r.category === selectedCategory;
    return matchesSearch && matchesMonth && matchesCategory;
  });

  // Unique suppliers & months
  const suppliers = Array.from(new Set(records.map((r) => r.supplier))) as string[];
  const latestMonth = Math.max(...records.map((r) => r.month)); // typically 8 or 9 (August/Sept)
  const last3Months = [latestMonth - 2, latestMonth - 1, latestMonth].filter((m) => m >= 1);

  // 1. Monthly Global OTIF Trend (Months 1 to 12)
  const monthlyTrendData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
    const mRecords = records.filter((r) => r.month === m);
    if (mRecords.length === 0) {
      return {
        month: m,
        monthName: MONTH_NAMES_FR[m - 1].substring(0, 4) + '.',
        fullName: `${MONTH_NAMES_FR[m - 1]} 2026`,
        globalOtif: null,
        target: 95.0
      };
    }
    const avg = Number((mRecords.reduce((acc, r) => acc + r.otifRate, 0) / mRecords.length).toFixed(1));
    return {
      month: m,
      monthName: MONTH_NAMES_FR[m - 1].substring(0, 4) + '.',
      fullName: `${MONTH_NAMES_FR[m - 1]} 2026`,
      globalOtif: avg,
      target: 95.0
    };
  }).filter((d) => d.globalOtif !== null);

  // 2. Global Average 3M OTIF Calculation (over last 3 months)
  const recordsLast3M = records.filter((r) => last3Months.includes(r.month));
  const avg3mGlobal = recordsLast3M.length > 0
    ? Number((recordsLast3M.reduce((acc, r) => acc + r.otifRate, 0) / recordsLast3M.length).toFixed(1))
    : 94.2;

  // Previous 3M for comparison (m-5 to m-3)
  const prev3Months = [latestMonth - 5, latestMonth - 4, latestMonth - 3].filter((m) => m >= 1);
  const recordsPrev3M = records.filter((r) => prev3Months.includes(r.month));
  const avgPrev3M = recordsPrev3M.length > 0
    ? Number((recordsPrev3M.reduce((acc, r) => acc + r.otifRate, 0) / recordsPrev3M.length).toFixed(1))
    : 93.8;

  const trend3mDelta = Number((avg3mGlobal - avgPrev3M).toFixed(1));

  // 3. Average 3M OTIF PER SUPPLIER (FRS)
  const supplier3mStats = suppliers.map((sup) => {
    const sRecords = records.filter((r) => r.supplier === sup);
    const sRecords3m = sRecords.filter((r) => last3Months.includes(r.month));
    const sLatestRecord = sRecords.find((r) => r.month === latestMonth);

    const avg3m = sRecords3m.length > 0
      ? Number((sRecords3m.reduce((acc, r) => acc + r.otifRate, 0) / sRecords3m.length).toFixed(1))
      : 0;

    const sPrev3m = sRecords.filter((r) => prev3Months.includes(r.month));
    const prev3mRate = sPrev3m.length > 0
      ? Number((sPrev3m.reduce((acc, r) => acc + r.otifRate, 0) / sPrev3m.length).toFixed(1))
      : avg3m;

    const deltaTrend = Number((avg3m - prev3mRate).toFixed(1));
    const latestRate = sLatestRecord ? sLatestRecord.otifRate : avg3m;
    const category = sRecords[0]?.category || 'Mécanique';

    let status: 'compliant' | 'warning' | 'critical' = 'compliant';
    if (avg3m >= 95.0) status = 'compliant';
    else if (avg3m >= 90.0) status = 'warning';
    else status = 'critical';

    return {
      supplier: sup,
      shortName: sup.replace(' Rail Systems', '').replace(' Transport', '').replace(' (Wabtec)', '').replace(' & Drives', ''),
      category,
      avg3m,
      prev3mRate,
      deltaTrend,
      latestRate,
      status,
      target: 95.0,
      totalLines3m: sRecords3m.reduce((a, b) => a + b.totalLines, 0)
    };
  }).sort((a, b) => b.avg3m - a.avg3m);

  // Filtered suppliers based on selected pill
  const filteredSuppliers = supplier3mStats.filter((s) => {
    const matchesSearch = s.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedSupplierView === 'all' || s.status === selectedSupplierView;
    const matchesCat = selectedCategory === 'all' || s.category === selectedCategory;
    return matchesSearch && matchesStatus && matchesCat;
  });

  const compliant3mCount = supplier3mStats.filter((s) => s.status === 'compliant').length;
  const warning3mCount = supplier3mStats.filter((s) => s.status === 'warning').length;
  const critical3mCount = supplier3mStats.filter((s) => s.status === 'critical').length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/30 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-400">
              04_OTIF — Tableau de Bord Performance Fournisseurs
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs text-slate-300 font-mono">
              {otifFiles.length} fichiers mensuels synchronisés
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            OTIF Mensuel & Moyenne 3 Mois (Average)
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Suivi consolidé de l'adhérence contractuelle (cible contractuelle ≥ 95%) : analyse mois par mois et calcul de l'<strong>Average 3M OTIF global</strong> et <strong>par fournisseur</strong> pour lisser les effets de saisonnalité et piloter les plans de progrès.
          </p>
        </div>

        <button
          onClick={onOpenFolderModal}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-semibold flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <FolderOpen className="h-4 w-4" />
          <span>Explorer 04_OTIF ({otifFiles.length} fichiers)</span>
        </button>
      </div>

      {/* 4 Main Core KPI Cards with Focus on 3M Average */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Average 3M Global */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Average 3M OTIF Global</span>
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">{avg3mGlobal}%</span>
            <span className={`text-xs font-semibold flex items-center gap-0.5 ${
              trend3mDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {trend3mDelta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend3mDelta >= 0 ? `+${trend3mDelta}%` : `${trend3mDelta}%`} vs T-1
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Horizon 3 mois glissants</span>
            <span className="text-emerald-400 font-mono font-medium">Cible : 95.0%</span>
          </div>
        </div>

        {/* KPI 2: Fournisseurs Conformes 3M */}
        <div 
          onClick={() => setSelectedSupplierView(selectedSupplierView === 'compliant' ? 'all' : 'compliant')}
          className={`bg-slate-900 border rounded-2xl p-5 shadow-lg cursor-pointer transition ${
            selectedSupplierView === 'compliant'
              ? 'border-emerald-500 ring-1 ring-emerald-500/50 bg-emerald-950/20'
              : 'border-emerald-900/40 bg-emerald-950/10 hover:border-emerald-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-400">Fournisseurs Conformes (3M ≥ 95%)</span>
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400 font-mono">{compliant3mCount}</span>
            <span className="text-xs text-slate-400">/ {suppliers.length} fournisseurs</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Statut :</span>
            <span className="text-emerald-300 font-semibold text-[11px]">Adhérence contractuelle</span>
          </div>
        </div>

        {/* KPI 3: Fournisseurs en Surveillance 3M */}
        <div 
          onClick={() => setSelectedSupplierView(selectedSupplierView === 'warning' ? 'all' : 'warning')}
          className={`bg-slate-900 border rounded-2xl p-5 shadow-lg cursor-pointer transition ${
            selectedSupplierView === 'warning'
              ? 'border-amber-500 ring-1 ring-amber-500/50 bg-amber-950/20'
              : 'border-amber-900/40 bg-amber-950/10 hover:border-amber-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-400">En Surveillance (90-95%)</span>
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-400 font-mono">{warning3mCount}</span>
            <span className="text-xs text-slate-400">fournisseurs</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Statut :</span>
            <span className="text-amber-300 font-semibold text-[11px]">Plan préventif requis</span>
          </div>
        </div>

        {/* KPI 4: Fournisseurs Critiques 3M */}
        <div 
          onClick={() => setSelectedSupplierView(selectedSupplierView === 'critical' ? 'all' : 'critical')}
          className={`bg-slate-900 border rounded-2xl p-5 shadow-lg cursor-pointer transition ${
            selectedSupplierView === 'critical'
              ? 'border-rose-500 ring-1 ring-rose-500/50 bg-rose-950/20'
              : 'border-rose-900/40 bg-rose-950/10 hover:border-rose-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-400">Dérive Critique (&lt;90%)</span>
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-400 font-mono">{critical3mCount}</span>
            <span className="text-xs text-slate-400">fournisseurs</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Action :</span>
            <span className="text-rose-300 font-semibold text-[11px]">Escalade Direction Achats</span>
          </div>
        </div>
      </div>

      {/* Main Analytical Graphs: Monthly OTIF Area + 3M Average FRS Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graph 1: OTIF Mensuel Global Janvier à Décembre */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-400" />
                Évolution de l'OTIF Mensuel Global vs Cible (95%)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Historique mois par mois sur l'année 2026 consolidé depuis 04_OTIF
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
              Dernier : {monthlyTrendData[monthlyTrendData.length - 1]?.globalOtif}%
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrendData} margin={{ top: 15, right: 15, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="otifGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="monthName" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis domain={[75, 100]} stroke="#94a3b8" fontSize={10} tickLine={false} unit="%" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs shadow-xl font-mono space-y-1">
                          <div className="font-bold text-white">{data.fullName}</div>
                          <div className="text-emerald-400">OTIF Global : {data.globalOtif}%</div>
                          <div className="text-slate-400">Cible Contractuelle : 95.0%</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={95} stroke="#38bdf8" strokeDasharray="4 4" label={{ value: 'Cible 95%', fill: '#38bdf8', fontSize: 10, position: 'insideTopRight' }} />
                <Area 
                  type="monotone" 
                  dataKey="globalOtif" 
                  stroke="#10b981" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#otifGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 2: Bar Chart - Average 3M OTIF Par Fournisseur */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Award className="h-4 w-4 text-sky-400" />
                Average 3M OTIF par Fournisseur
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Moyenne 3 mois glissants lissant les variations ponctuelles
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="text-emerald-400 flex items-center gap-1">■ ≥95%</span>
              <span className="text-amber-400 flex items-center gap-1">■ 90-95%</span>
              <span className="text-rose-400 flex items-center gap-1">■ &lt;90%</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={supplier3mStats} 
                layout="vertical"
                margin={{ top: 5, right: 25, left: 35, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} horizontal={false} />
                <XAxis type="number" domain={[75, 100]} stroke="#94a3b8" fontSize={10} tickLine={false} unit="%" />
                <YAxis 
                  dataKey="shortName" 
                  type="category" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false} 
                  width={80}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs shadow-xl space-y-1">
                          <div className="font-bold text-white">{data.supplier}</div>
                          <div className="text-[11px] text-slate-400">Catégorie : {data.category}</div>
                          <div className="font-mono font-bold text-emerald-400">Average 3M OTIF : {data.avg3m}%</div>
                          <div className="font-mono text-slate-300">Dernier Mois : {data.latestRate}%</div>
                          <div className="font-mono text-slate-400">Tendance 3M vs T-1 : {data.deltaTrend >= 0 ? `+${data.deltaTrend}%` : `${data.deltaTrend}%`}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine x={95} stroke="#38bdf8" strokeDasharray="4 4" label={{ value: '95%', fill: '#38bdf8', fontSize: 10, position: 'top' }} />
                <Bar dataKey="avg3m" radius={[0, 4, 4, 0]}>
                  {supplier3mStats.map((entry, index) => {
                    const color = entry.status === 'compliant' ? '#10b981' : entry.status === 'warning' ? '#f59e0b' : '#f43f5e';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par fournisseur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Supplier status filter */}
          <select
            value={selectedSupplierView}
            onChange={(e) => setSelectedSupplierView(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">Tous les statuts 3M</option>
            <option value="compliant">Conformes (≥ 95%)</option>
            <option value="warning">En surveillance (90-95%)</option>
            <option value="critical">Critiques (&lt; 90%)</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">Toutes catégories</option>
            <option value="Mécanique">Mécanique</option>
            <option value="Électronique">Électronique</option>
            <option value="Fonderie">Fonderie</option>
            <option value="Usinage">Usinage</option>
            <option value="Câblage">Câblage</option>
          </select>

          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">Tous les mois (Historique)</option>
            {MONTH_NAMES_FR.map((m, idx) => (
              <option key={m} value={(idx + 1).toString()}>{m} 2026</option>
            ))}
          </select>
        </div>
      </div>

      {/* Supplier Scorecard Table: Monthly vs 3M Average */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Scorecard Fournisseurs : Synthèse Mensuelle & Average 3M OTIF
            </h3>
            <span className="text-[11px] text-slate-500">
              Calcul de moyenne mobile 3 mois pour chaque fournisseur avec détection des tendances
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {filteredSuppliers.length} fournisseurs analysés
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Fournisseur</th>
                <th className="px-4 py-3">Catégorie Métier</th>
                <th className="px-4 py-3">Average 3M OTIF</th>
                <th className="px-4 py-3">OTIF Mois Actuel</th>
                <th className="px-4 py-3">Tendance 3M</th>
                <th className="px-4 py-3">Lignes Livrées (3M)</th>
                <th className="px-4 py-3">Statut Cible (≥ 95%)</th>
                <th className="px-4 py-3">Recommandation Achats</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredSuppliers.map((s, idx) => {
                const isTargetMet = s.avg3m >= 95.0;
                const isWarning = s.avg3m >= 90.0 && s.avg3m < 95.0;

                return (
                  <tr key={s.supplier} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-mono text-[10px]">#{idx + 1}</span>
                        <span className="font-semibold text-slate-100">{s.supplier}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {s.category}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-sm">
                      <span className={isTargetMet ? 'text-emerald-400' : isWarning ? 'text-amber-400' : 'text-rose-400'}>
                        {s.avg3m}%
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-200">
                      {s.latestRate}%
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {s.deltaTrend > 0 ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                          <ArrowUpRight className="h-3 w-3" /> +{s.deltaTrend}%
                        </span>
                      ) : s.deltaTrend < 0 ? (
                        <span className="text-rose-400 flex items-center gap-1 font-semibold">
                          <ArrowDownRight className="h-3 w-3" /> {s.deltaTrend}%
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-1">
                          <Minus className="h-3 w-3" /> 0.0%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300">
                      {s.totalLines3m}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                        isTargetMet
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : isWarning
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {isTargetMet ? 'Conforme ≥95%' : isWarning ? 'Surveillance' : 'Non conforme'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {isTargetMet ? (
                        <span className="text-emerald-400/90 text-[11px]">Maintenir cadence & partenariat</span>
                      ) : isWarning ? (
                        <span className="text-amber-300/90 text-[11px]">Revue mensuelle performance & buffer</span>
                      ) : (
                        <span className="text-rose-300 font-medium text-[11px]">Audit capacitaire & plan de rattrapage</span>
                      )}
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
