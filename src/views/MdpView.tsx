import React, { useState } from 'react';
import { 
  Clock, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  FileText, 
  Layers,
  ArrowRight,
  FolderOpen,
  Zap,
  XCircle,
  HelpCircle,
  BarChart3,
  PieChart as PieChartIcon,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
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
import { MDPRecord, PublicFileMetadata, ExceptionMessageCode } from '../types';
import { EXCEPTION_MESSAGES_INFO } from '../utils/mrpExceptions';

interface MdpViewProps {
  records: MDPRecord[];
  files: PublicFileMetadata[];
  onOpenFolderModal: () => void;
}

export const MdpView: React.FC<MdpViewProps> = ({
  records,
  files,
  onOpenFolderModal
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedException, setSelectedException] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');

  const mdpFiles = files.filter((f) => f.folderKey === 'mdp');

  // Filter records
  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.contractNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesException = 
      selectedException === 'all' || 
      r.exceptionCode === selectedException;

    const matchesStatus = selectedStatus === 'all' || r.status === selectedStatus;
    const matchesProj = selectedProject === 'all' || r.project === selectedProject;
    const matchesSupplier = selectedSupplier === 'all' || r.supplier === selectedSupplier;

    return matchesSearch && matchesException && matchesStatus && matchesProj && matchesSupplier;
  });

  // KPI Calculations
  const totalOrdersCount = records.length;
  const totalVolume = records.reduce((acc, r) => acc + r.quantity, 0);
  const totalOrderAmount = records.reduce((acc, r) => acc + (r.totalAmount || r.quantity * 500), 0);

  // Exception Message Counts
  const msg10Records = records.filter((r) => r.exceptionCode === '10');
  const msg15Records = records.filter((r) => r.exceptionCode === '15');
  const msg20Records = records.filter((r) => r.exceptionCode === '20');
  const noneRecords = records.filter((r) => r.exceptionCode === 'NONE');

  const msg10Qty = msg10Records.reduce((acc, r) => acc + r.quantity, 0);
  const msg15Qty = msg15Records.reduce((acc, r) => acc + r.quantity, 0);
  const msg20Qty = msg20Records.reduce((acc, r) => acc + r.quantity, 0);

  // Donut Chart Data: Exception Messages distribution
  const exceptionPieData = [
    { name: "Msg 10 : Avancement", value: msg10Records.length, qty: msg10Qty, color: '#f43f5e', code: '10' },
    { name: "Msg 15 : Report", value: msg15Records.length, qty: msg15Qty, color: '#f59e0b', code: '15' },
    { name: "Msg 20 : À Annuler", value: msg20Records.length, qty: msg20Qty, color: '#a855f7', code: '20' },
    { name: "Conformes (Sans exception)", value: noneRecords.length, qty: noneRecords.reduce((a, b) => a + b.quantity, 0), color: '#10b981', code: 'NONE' }
  ];

  // Supplier Exception Aggregates
  const suppliers = Array.from(new Set(records.map((r) => r.supplier))) as string[];
  const projects = Array.from(new Set(records.map((r) => r.project))) as string[];

  const supplierExceptionStats = suppliers.slice(0, 6).map((sup) => {
    const sRecords = records.filter((r) => r.supplier === sup);
    return {
      supplier: sup.split(' ')[0] + (sup.split(' ')[1] ? ' ' + sup.split(' ')[1] : ''),
      fullName: sup,
      msg10: sRecords.filter((r) => r.exceptionCode === '10').length,
      msg15: sRecords.filter((r) => r.exceptionCode === '15').length,
      msg20: sRecords.filter((r) => r.exceptionCode === '20').length,
      conformes: sRecords.filter((r) => r.exceptionCode === 'NONE').length
    };
  });

  // Timeline horizon chart (by weeks)
  const weeks = (Array.from(new Set(records.map((r) => r.week))) as number[]).sort((a, b) => a - b).slice(-8);
  const horizonData = weeks.map((w) => {
    const wRecords = records.filter((r) => r.week === w);
    const confirmed = wRecords.filter((r) => r.status === 'Confirmé' && r.exceptionCode !== '20').reduce((a, b) => a + b.quantity, 0);
    const unconfirmed = wRecords.filter((r) => r.status === 'Non confirmé').reduce((a, b) => a + b.quantity, 0);
    const toCancel = wRecords.filter((r) => r.exceptionCode === '20').reduce((a, b) => a + b.quantity, 0);
    return {
      week: `W${w}`,
      confirmed,
      unconfirmed,
      toCancel,
      total: confirmed + unconfirmed + toCancel
    };
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase font-bold tracking-wider text-indigo-400">
              02_MDP — Carnet des Commandes Global & Planning
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs text-slate-300 font-mono">
              {mdpFiles.length} fichiers hebdomadaires synchronisés
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Carnet de Commandes Global & Messages d'Exception MRP
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Gestion intégrée des besoins d'approvisionnement et pilotage des messages d'exception : <strong>Message 10</strong> (demande d'avancement), <strong>Message 15</strong> (demande de report), et <strong>Message 20</strong> (besoin à annuler : commande avec date confirmée mais sans Need Date).
          </p>
        </div>

        <button
          onClick={onOpenFolderModal}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-semibold flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <FolderOpen className="h-4 w-4" />
          <span>Explorer 02_MDP ({mdpFiles.length} fichiers)</span>
        </button>
      </div>

      {/* 4 Main Core KPI Cards with Direct Exception Filters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Carnet Global */}
        <div 
          onClick={() => setSelectedException('all')}
          className={`bg-slate-900 border rounded-2xl p-5 shadow-lg cursor-pointer transition ${
            selectedException === 'all' ? 'border-sky-400 ring-1 ring-sky-400/40' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Carnet Global Commandes</span>
            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{totalOrdersCount}</span>
            <span className="text-xs font-medium text-slate-400">lignes ({totalVolume.toLocaleString('fr-FR')} pcs)</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Engagement financier</span>
            <span className="font-mono text-emerald-400 font-bold">{(totalOrderAmount / 1000000).toFixed(2)} M€</span>
          </div>
        </div>

        {/* KPI 2: Message 10 — Demande d'avancement de besoin */}
        <div 
          onClick={() => setSelectedException(selectedException === '10' ? 'all' : '10')}
          className={`bg-slate-900 border rounded-2xl p-5 shadow-lg cursor-pointer transition ${
            selectedException === '10' 
              ? 'border-rose-500 ring-1 ring-rose-500/50 bg-rose-950/20' 
              : 'border-rose-900/40 bg-rose-950/10 hover:border-rose-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-400">Message 10 : Avancement</span>
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-400 font-mono">{msg10Records.length}</span>
            <span className="text-xs font-medium text-rose-300">lignes ({msg10Qty} pcs)</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Action :</span>
            <span className="text-rose-400 font-semibold text-[11px]">Avancer la livraison</span>
          </div>
        </div>

        {/* KPI 3: Message 15 — Demande de report de besoin */}
        <div 
          onClick={() => setSelectedException(selectedException === '15' ? 'all' : '15')}
          className={`bg-slate-900 border rounded-2xl p-5 shadow-lg cursor-pointer transition ${
            selectedException === '15' 
              ? 'border-amber-500 ring-1 ring-amber-500/50 bg-amber-950/20' 
              : 'border-amber-900/40 bg-amber-950/10 hover:border-amber-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-400">Message 15 : Report</span>
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400 font-mono">{msg15Records.length}</span>
            <span className="text-xs font-medium text-amber-300">lignes ({msg15Qty} pcs)</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Action :</span>
            <span className="text-amber-400 font-semibold text-[11px]">Différer la livraison</span>
          </div>
        </div>

        {/* KPI 4: Message 20 — Besoin à annuler */}
        <div 
          onClick={() => setSelectedException(selectedException === '20' ? 'all' : '20')}
          className={`bg-slate-900 border rounded-2xl p-5 shadow-lg cursor-pointer transition ${
            selectedException === '20' 
              ? 'border-purple-500 ring-1 ring-purple-500/50 bg-purple-950/20' 
              : 'border-purple-900/40 bg-purple-950/10 hover:border-purple-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-purple-400">Message 20 : À Annuler</span>
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
              <XCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-400 font-mono">{msg20Records.length}</span>
            <span className="text-xs font-medium text-purple-300">lignes ({msg20Qty} pcs)</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Règle :</span>
            <span className="text-purple-400 font-semibold text-[11px]">Date confirmée sans Need Date</span>
          </div>
        </div>
      </div>

      {/* Exception Message Concept Explanation Bar */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-indigo-400 flex-shrink-0" />
          <span className="text-slate-300 font-semibold">Principe des Messages d'Exception MRP :</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <strong className="text-slate-200">Message 10 :</strong> Demande d'avancement (besoin anticipé / retard fournisseur)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <strong className="text-slate-200">Message 15 :</strong> Demande de report (besoin repoussé / risque surstock)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-purple-500" />
            <strong className="text-slate-200">Message 20 :</strong> Besoin à annuler (date confirmée et pas de need date)
          </span>
        </div>
      </div>

      {/* Analytical Charts Section: Exception Breakdown & Timeline Horizon */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Donut Chart - Exception Messages Share */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-indigo-400" />
              Répartition des Messages MRP
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">{totalOrdersCount} ordres</span>
          </div>

          <div className="h-56 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={exceptionPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
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
                        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs shadow-xl space-y-1">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: data.color }} />
                            {data.name}
                          </div>
                          <div className="text-slate-300 font-mono">Lignes : {data.value}</div>
                          <div className="text-slate-400 font-mono">Volume : {data.qty.toLocaleString('fr-FR')} pcs</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend rows */}
          <div className="space-y-1.5 pt-3 border-t border-slate-800/80 text-xs">
            {exceptionPieData.map((item) => (
              <div 
                key={item.name} 
                onClick={() => setSelectedException(selectedException === item.code ? 'all' : item.code)}
                className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-800/40 cursor-pointer transition"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300">{item.name}</span>
                </div>
                <div className="font-mono font-bold text-slate-200">
                  {item.value} <span className="text-slate-500 font-normal">({Math.round((item.value / totalOrdersCount) * 100)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Carnet de Commandes par Horizon Temporel */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-400" />
                Carnet de Commandes par Horizon (Semaines W28 - W35)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Ventilation des volumes confirmés, non confirmés et ordres sans need date (à annuler)
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={horizonData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs shadow-xl space-y-1 font-mono">
                          <div className="font-bold text-white mb-1">{label}</div>
                          <div className="text-emerald-400">Confirmé : {payload[0]?.value} pcs</div>
                          <div className="text-rose-400">Non confirmé : {payload[1]?.value} pcs</div>
                          <div className="text-purple-400">À Annuler (Msg 20) : {payload[2]?.value} pcs</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
                <Bar dataKey="confirmed" name="Confirmé" fill="#10b981" stackId="h" radius={[0, 0, 0, 0]} />
                <Bar dataKey="unconfirmed" name="Non confirmé" fill="#f43f5e" stackId="h" radius={[0, 0, 0, 0]} />
                <Bar dataKey="toCancel" name="À Annuler (Msg 20)" fill="#a855f7" stackId="h" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Filter and Quick Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par référence, désignation, fournisseur, PO, contrat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Exception Filter */}
          <select
            value={selectedException}
            onChange={(e) => setSelectedException(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">Tous les messages MRP</option>
            <option value="10">⚡ Message 10 : Avancement</option>
            <option value="15">⏱️ Message 15 : Report</option>
            <option value="20">🚫 Message 20 : À Annuler (sans Need Date)</option>
            <option value="NONE">✅ Conforme (sans exception)</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">Tous statuts</option>
            <option value="Confirmé">Confirmé</option>
            <option value="Non confirmé">Non confirmé</option>
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

          {/* Supplier Filter */}
          <select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">Tous fournisseurs</option>
            {suppliers.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table MDP */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Lignes de Commandes MDP & Messages d'Exception ({filteredRecords.length})
            </h3>
            <span className="text-[11px] text-slate-500">
              Affichage détaillé avec règle d'exception 10, 15 et 20
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {filteredRecords.filter(r => r.exceptionCode === '20').length} besoins à annuler détectés
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Message MRP</th>
                <th className="px-4 py-3">Référence & Désignation</th>
                <th className="px-4 py-3">Fournisseur</th>
                <th className="px-4 py-3">Projet & PO</th>
                <th className="px-4 py-3">Date Besoin (Need)</th>
                <th className="px-4 py-3">Date Confirmée</th>
                <th className="px-4 py-3">Écart (Jours)</th>
                <th className="px-4 py-3">Quantité</th>
                <th className="px-4 py-3">Action Recommandée Approvisionneur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRecords.map((r) => {
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
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold bg-purple-950 text-purple-300 border border-purple-800 animate-pulse">
                          <XCircle className="h-3 w-3" />
                          Msg 20 : À Annuler
                        </span>
                      )}
                      {!isMsg10 && !isMsg15 && !isMsg20 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                          <CheckCircle2 className="h-3 w-3" />
                          Conforme
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-sky-400">{r.reference}</div>
                      <div className="text-[11px] text-slate-300">{r.designation}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-200 font-medium">
                      {r.supplier}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      <div>{r.project}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{r.poNumber}</div>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {r.needDate ? (
                        <span className="text-slate-200 font-medium">{r.needDate}</span>
                      ) : (
                        <span className="text-purple-400 font-bold bg-purple-950/40 px-2 py-0.5 rounded border border-purple-800/40 block">
                          AUCUNE (À Annuler)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {r.confirmedDate ? (
                        <span className="text-slate-100 font-semibold">{r.confirmedDate}</span>
                      ) : (
                        <span className="text-rose-400 italic font-medium">Non confirmée</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {isMsg20 ? (
                        <span className="text-purple-400 font-bold">Sans besoin</span>
                      ) : r.deltaDays > 0 ? (
                        <span className="text-rose-400 font-bold">+{r.deltaDays} j (Retard)</span>
                      ) : r.deltaDays < 0 ? (
                        <span className="text-sky-400 font-bold">{r.deltaDays} j (Avance)</span>
                      ) : (
                        <span className="text-emerald-400 font-medium">0 j (À l'heure)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-100">
                      <div>{r.quantity} pcs</div>
                      {r.totalAmount && (
                        <div className="text-[10px] text-slate-500 font-normal">{r.totalAmount.toLocaleString('fr-FR')} €</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-300 font-medium block max-w-sm">
                        {r.exceptionAction || "Suivi régulier de l'ordre d'achat"}
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
