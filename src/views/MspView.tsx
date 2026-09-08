import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Building2, 
  Calendar,
  Layers,
  FileSpreadsheet,
  Download,
  Flame,
  ShieldAlert,
  BarChart3,
  PieChart as PieChartIcon
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
  Legend 
} from 'recharts';
import { MSPRecord, PublicFileMetadata } from '../types';

interface MspViewProps {
  records: MSPRecord[];
  files: PublicFileMetadata[];
  onOpenFolderModal: () => void;
}

export const MspView: React.FC<MspViewProps> = ({
  records,
  files,
  onOpenFolderModal
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCriticality, setSelectedCriticality] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedWeek, setSelectedWeek] = useState<string>('all');

  const mspFiles = files.filter((f) => f.folderKey === 'msp');

  // Filter records
  const filteredRecords = records.filter((r) => {
    const matchesSearch = 
      r.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.impactOrder.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCrit = selectedCriticality === 'all' || r.criticality === selectedCriticality;
    const matchesProj = selectedProject === 'all' || r.project === selectedProject;
    const matchesWeek = selectedWeek === 'all' || r.week.toString() === selectedWeek;

    return matchesSearch && matchesCrit && matchesProj && matchesWeek;
  });

  // KPI Calculations
  const totalMissingParts = filteredRecords.reduce((acc, r) => acc + r.missingQuantity, 0);
  const criticalCount = filteredRecords.filter((r) => r.criticality === 'Critique').length;
  const majorCount = filteredRecords.filter((r) => r.criticality === 'Majeur').length;
  const minorCount = filteredRecords.filter((r) => r.criticality === 'Mineur').length;

  // Weeks list & Trend data
  const weeks = (Array.from(new Set(records.map((r) => r.week))) as number[]).sort((a, b) => a - b);
  const weeklyTrendData = weeks.map((w) => {
    const wRecords = records.filter((r) => r.week === w);
    return {
      week: `W${w}`,
      weekNum: w,
      pieces: wRecords.reduce((acc, r) => acc + r.missingQuantity, 0),
      references: wRecords.length,
      critical: wRecords.filter((r) => r.criticality === 'Critique').length
    };
  });

  // Criticality Pie Data
  const criticalityData = [
    { name: 'Critique (Arrêt Ligne)', value: criticalCount, color: '#f43f5e' },
    { name: 'Majeur (<15j)', value: majorCount, color: '#f59e0b' },
    { name: 'Mineur (Solution Palliative)', value: minorCount, color: '#38bdf8' }
  ];

  // Supplier Pareto / Ranking
  const supplierMap: Record<string, number> = {};
  filteredRecords.forEach((r) => {
    supplierMap[r.supplier] = (supplierMap[r.supplier] || 0) + r.missingQuantity;
  });
  const topSuppliersData = Object.entries(supplierMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([sup, qty]) => ({
      supplier: sup.replace(' Rail Systems', '').replace(' Transport', '').replace(' (Wabtec)', ''),
      fullName: sup,
      qty
    }));

  // Project Breakdown
  const projects = Array.from(new Set(records.map((r) => r.project))) as string[];
  const projectBreakdownData = projects.map((p) => {
    const pRecords = filteredRecords.filter((r) => r.project === p);
    return {
      project: p.replace('Alstom ', ''),
      fullName: p,
      pieces: pRecords.reduce((acc, r) => acc + r.missingQuantity, 0),
      lines: pRecords.length
    };
  }).filter((p) => p.pieces > 0);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950/20 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase font-bold tracking-wider text-rose-400">
              01_MSP — Tableau de Bord Missing Parts (Manquants Ligne)
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs text-slate-300 font-mono">
              {mspFiles.length} fichiers hebdomadaires consolidés
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Dashboard Pièces Manquantes & Prévention Arrêts de Ligne
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Analyse consolidée hebdomadaire des ruptures de stock, criticité d'assemblage, Pareto des fournisseurs défaillants et projection des dates de promesses.
          </p>
        </div>

        <button
          onClick={onOpenFolderModal}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-semibold flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Explorer 01_MSP ({mspFiles.length} fichiers)</span>
        </button>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div 
          onClick={() => setSelectedCriticality('all')}
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-slate-700 transition"
        >
          <span className="text-xs text-slate-400 font-medium">Total Pièces Manquantes</span>
          <div className="text-2xl font-black text-white font-mono mt-1">{totalMissingParts}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Sur {filteredRecords.length} références actives</span>
        </div>

        <div 
          onClick={() => setSelectedCriticality(selectedCriticality === 'Critique' ? 'all' : 'Critique')}
          className={`bg-slate-900 border rounded-xl p-4 cursor-pointer transition ${
            selectedCriticality === 'Critique' ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-950/20' : 'border-rose-900/50 bg-rose-950/10 hover:border-rose-700'
          }`}
        >
          <span className="text-xs text-rose-400 font-medium flex items-center gap-1">
            <Flame className="h-3.5 w-3.5" /> Criticité Critique
          </span>
          <div className="text-2xl font-black text-rose-400 font-mono mt-1">{criticalCount}</div>
          <span className="text-[11px] text-rose-300/70 mt-1 block">Arrêt de ligne imminent (&lt;48h)</span>
        </div>

        <div 
          onClick={() => setSelectedCriticality(selectedCriticality === 'Majeur' ? 'all' : 'Majeur')}
          className={`bg-slate-900 border rounded-xl p-4 cursor-pointer transition ${
            selectedCriticality === 'Majeur' ? 'border-amber-500 ring-1 ring-amber-500 bg-amber-950/20' : 'border-amber-900/50 bg-amber-950/10 hover:border-amber-700'
          }`}
        >
          <span className="text-xs text-amber-400 font-medium">Criticité Majeure</span>
          <div className="text-2xl font-black text-amber-400 font-mono mt-1">{majorCount}</div>
          <span className="text-[11px] text-amber-300/70 mt-1 block">Impact planning sous 15 jours</span>
        </div>

        <div 
          onClick={() => setSelectedCriticality(selectedCriticality === 'Mineur' ? 'all' : 'Mineur')}
          className={`bg-slate-900 border rounded-xl p-4 cursor-pointer transition ${
            selectedCriticality === 'Mineur' ? 'border-sky-500 ring-1 ring-sky-500 bg-sky-950/20' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-xs text-sky-400 font-medium">Criticité Mineure</span>
          <div className="text-2xl font-black text-sky-400 font-mono mt-1">{minorCount}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Solution palliative disponible</span>
        </div>
      </div>

      {/* Main Analytical Graphs: Weekly Evolution Area + Donut Criticality */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graph 1: Weekly Evolution Area Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-rose-400" />
                Évolution Hebdomadaire des Pièces Manquantes (W12 - W35)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Volume cumulé de pièces manquantes et nombre de références critiques
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950/40 border border-rose-800/40 px-2 py-0.5 rounded">
              W35 : {totalMissingParts} pcs
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrendData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="mspAreaGradient" x1="0" y1="0" x2="0" y2="1">
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
                          <div className="font-bold text-white">{data.week} (2026)</div>
                          <div className="text-rose-400 font-bold">Pièces manquantes : {data.pieces} pcs</div>
                          <div className="text-slate-300">Références : {data.references}</div>
                          <div className="text-amber-400">Critiques : {data.critical}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="pieces" 
                  name="Pièces manquantes"
                  stroke="#f43f5e" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#mspAreaGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 2: Donut Chart - Criticality Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-amber-400" />
              Répartition par Criticité
            </h3>
          </div>

          <div className="h-52 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={criticalityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {criticalityData.map((entry) => (
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
                          <div style={{ color: data.color }}>{data.value} références</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs">
            {criticalityData.map((item) => (
              <div key={item.name} className="flex items-center justify-between py-1 px-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300">{item.name}</span>
                </div>
                <span className="font-mono font-bold text-slate-200">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Graphs: Top Suppliers Pareto & Project Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pareto Top 5 Suppliers */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-sky-400" />
            Top 5 Fournisseurs Générateurs de Manquants
          </h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topSuppliersData} layout="vertical" margin={{ top: 5, right: 20, left: 35, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis dataKey="supplier" type="category" stroke="#94a3b8" fontSize={10} tickLine={false} width={80} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs shadow-xl font-mono">
                          <div className="font-bold text-white">{data.fullName}</div>
                          <div className="text-rose-400 font-bold">{data.qty} pièces manquantes</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="qty" fill="#f43f5e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Project Breakdown Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-400" />
            Impact Pièces Manquantes par Programme / Projet
          </h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectBreakdownData} margin={{ top: 5, right: 15, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="project" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs shadow-xl font-mono">
                          <div className="font-bold text-white">{data.fullName}</div>
                          <div className="text-indigo-300 font-bold">{data.pieces} pcs manquantes</div>
                          <div className="text-slate-400">{data.lines} références</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="pieces" fill="#6366f1" radius={[4, 4, 0, 0]} />
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
              placeholder="Rechercher par référence, désignation, fournisseur, OF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Week Filter */}
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">Toutes les semaines</option>
            {weeks.map((w) => (
              <option key={w} value={w.toString()}>Semaine {w}</option>
            ))}
          </select>

          {/* Criticality Filter */}
          <select
            value={selectedCriticality}
            onChange={(e) => setSelectedCriticality(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">Toutes criticités</option>
            <option value="Critique">Critique</option>
            <option value="Majeur">Majeur</option>
            <option value="Mineur">Mineur</option>
          </select>

          {/* Project Filter */}
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">Tous projets</option>
            {projects.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table of Missing Parts */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Lignes de Manquants Détaillées ({filteredRecords.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Pipeline Auto Data Sync : OK
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Semaine</th>
                <th className="px-4 py-3">Référence</th>
                <th className="px-4 py-3">Désignation</th>
                <th className="px-4 py-3">Fournisseur</th>
                <th className="px-4 py-3">Qté Manquante</th>
                <th className="px-4 py-3">Criticité</th>
                <th className="px-4 py-3">Projet & Ordre Impacté</th>
                <th className="px-4 py-3">Cause Racine</th>
                <th className="px-4 py-3">Date Promesse</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3 font-mono font-medium text-slate-400">
                    W{r.week}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-sky-400">
                    {r.reference}
                  </td>
                  <td className="px-4 py-3 text-slate-200 font-medium">
                    {r.designation}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {r.supplier}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-rose-300">
                    {r.missingQuantity}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      r.criticality === 'Critique'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : r.criticality === 'Majeur'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-sky-950 text-sky-300 border border-sky-800'
                    }`}>
                      {r.criticality}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <div>{r.project}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{r.impactOrder}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 max-w-xs truncate">
                    {r.rootCause}
                  </td>
                  <td className="px-4 py-3 font-mono text-emerald-400">
                    {r.promiseDate || 'En attente'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
