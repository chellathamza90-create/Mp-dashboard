import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Package,
  Users,
  Building2,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Search,
  Filter,
  Download,
  Plus,
  ArrowUpDown,
  RefreshCw,
  Clock,
  Euro,
  Layers,
  ChevronRight,
  ShieldAlert,
  Flame,
  FileSpreadsheet,
  Edit3,
  X
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
import { StockRecord, StockStatus } from '../types';
import { MATERIAL_PLANNERS, KNOWN_SUPPLIERS, PROJECTS } from '../services/initialData';

interface StockViewProps {
  stockRecords: StockRecord[];
  onUpdateStockRecord?: (record: StockRecord) => void;
  onAddStockRecord?: (record: StockRecord) => void;
}

type StockSubView = 'global' | 'mp' | 'frs';

export const StockView: React.FC<StockViewProps> = ({
  stockRecords,
  onUpdateStockRecord,
  onAddStockRecord
}) => {
  // Navigation & Sub-views
  const [activeSubView, setActiveSubView] = useState<StockSubView>('global');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMP, setSelectedMP] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dormantOnly, setDormantOnly] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<keyof StockRecord>('stockValue');
  const [sortAsc, setSortAsc] = useState(false);

  // Modal State for Quick Edit / Adjust
  const [editingRecord, setEditingRecord] = useState<StockRecord | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // Form State for editing
  const [formOnHand, setFormOnHand] = useState<number>(0);
  const [formSafety, setFormSafety] = useState<number>(0);
  const [formMax, setFormMax] = useState<number>(0);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return stockRecords.filter((rec) => {
      // Search text
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = 
          rec.reference.toLowerCase().includes(q) ||
          rec.designation.toLowerCase().includes(q) ||
          rec.materialPlanner.toLowerCase().includes(q) ||
          rec.supplier.toLowerCase().includes(q) ||
          rec.project.toLowerCase().includes(q) ||
          rec.storageLocation.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Material Planner filter (when in global or specific sub-view)
      if (selectedMP !== 'all' && rec.materialPlanner !== selectedMP) {
        return false;
      }

      // Supplier filter
      if (selectedSupplier !== 'all' && rec.supplier !== selectedSupplier) {
        return false;
      }

      // Project filter
      if (selectedProject !== 'all' && rec.project !== selectedProject) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && rec.stockStatus !== selectedStatus) {
        return false;
      }

      // Dormant only
      if (dormantOnly && rec.dormantStockQty <= 0) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? (Number(valA) - Number(valB)) : (Number(valB) - Number(valA));
    });
  }, [stockRecords, searchQuery, selectedMP, selectedSupplier, selectedProject, selectedStatus, dormantOnly, sortField, sortAsc]);

  // Overall Global Aggregates
  const totalStockValue = useMemo(() => stockRecords.reduce((sum, r) => sum + r.stockValue, 0), [stockRecords]);
  const totalDormantValue = useMemo(() => stockRecords.reduce((sum, r) => sum + r.dormantStockValue, 0), [stockRecords]);
  const totalOnHandQty = useMemo(() => stockRecords.reduce((sum, r) => sum + r.onHandQuantity, 0), [stockRecords]);
  const totalDormantQty = useMemo(() => stockRecords.reduce((sum, r) => sum + r.dormantStockQty, 0), [stockRecords]);
  const alertMiniCount = useMemo(() => stockRecords.filter(r => r.stockStatus === 'Alerte Mini' || r.stockStatus === 'Rupture Imminente').length, [stockRecords]);
  const surstockCount = useMemo(() => stockRecords.filter(r => r.stockStatus === 'Surstock').length, [stockRecords]);
  const optimalCount = useMemo(() => stockRecords.filter(r => r.stockStatus === 'Optimal').length, [stockRecords]);
  const averageCoverageDays = useMemo(() => {
    const valid = stockRecords.filter(r => r.coverageDays > 0);
    return valid.length > 0 ? Math.round(valid.reduce((sum, r) => sum + r.coverageDays, 0) / valid.length) : 28;
  }, [stockRecords]);

  // Aggregation by Material Planner
  const mpSummary = useMemo(() => {
    return MATERIAL_PLANNERS.map((mpObj) => {
      const mp = mpObj.name;
      const recs = stockRecords.filter(r => r.materialPlanner === mp);
      const totalVal = recs.reduce((sum, r) => sum + r.stockValue, 0);
      const dormantVal = recs.reduce((sum, r) => sum + r.dormantStockValue, 0);
      const alerts = recs.filter(r => r.stockStatus === 'Alerte Mini' || r.stockStatus === 'Rupture Imminente').length;
      const surstocks = recs.filter(r => r.stockStatus === 'Surstock').length;
      const avgCov = recs.length > 0 ? Math.round(recs.reduce((sum, r) => sum + r.coverageDays, 0) / recs.length) : 0;
      return {
        name: mp,
        code: mpObj.code,
        role: mpObj.role,
        shortName: mp.split(' ')[0],
        totalRecords: recs.length,
        totalValue: totalVal,
        dormantValue: dormantVal,
        dormantRate: totalVal > 0 ? Math.round((dormantVal / totalVal) * 100) : 0,
        alerts,
        surstocks,
        avgCoverage: avgCov
      };
    });
  }, [stockRecords]);

  // Aggregation by Supplier (FRS)
  const frsSummary = useMemo(() => {
    return KNOWN_SUPPLIERS.map((sup) => {
      const recs = stockRecords.filter(r => r.supplier === sup);
      const totalVal = recs.reduce((sum, r) => sum + r.stockValue, 0);
      const dormantVal = recs.reduce((sum, r) => sum + r.dormantStockValue, 0);
      const alerts = recs.filter(r => r.stockStatus === 'Alerte Mini' || r.stockStatus === 'Rupture Imminente').length;
      const onHand = recs.reduce((sum, r) => sum + r.onHandQuantity, 0);
      return {
        supplier: sup,
        shortName: sup.split(' ')[0],
        totalRecords: recs.length,
        totalValue: totalVal,
        dormantValue: dormantVal,
        onHandQuantity: onHand,
        alerts
      };
    }).sort((a, b) => b.totalValue - a.totalValue);
  }, [stockRecords]);

  // Chart Data: Status Pie
  const statusPieData = [
    { name: 'Optimal (Conforme)', value: optimalCount, color: '#10b981' },
    { name: 'Alerte Mini', value: alertMiniCount, color: '#f59e0b' },
    { name: 'Surstock', value: surstockCount, color: '#a855f7' },
    { name: 'Stock Dormant (>90j)', value: stockRecords.filter(r => r.dormantStockQty > 0).length, color: '#f43f5e' }
  ];

  // Chart Data: MP Bar
  const mpBarData = mpSummary.map(m => ({
    name: m.name,
    shortName: m.shortName,
    valeurK: Math.round(m.totalValue / 1000),
    dormantK: Math.round(m.dormantValue / 1000)
  }));

  // Handlers for edit
  const handleOpenEdit = (rec: StockRecord) => {
    setEditingRecord(rec);
    setFormOnHand(rec.onHandQuantity);
    setFormSafety(rec.safetyStock);
    setFormMax(rec.maxStock);
  };

  const handleSaveEdit = () => {
    if (!editingRecord) return;
    const avail = Math.max(0, formOnHand - editingRecord.reservedQuantity);
    const cost = editingRecord.unitCost;
    const val = formOnHand * cost;
    const cov = editingRecord.dailyConsumptionRate > 0 ? Math.round(avail / editingRecord.dailyConsumptionRate) : 30;
    
    let newStatus: StockStatus = 'Optimal';
    if (avail <= 0) newStatus = 'Rupture Imminente';
    else if (avail < formSafety) newStatus = 'Alerte Mini';
    else if (avail > formMax) newStatus = 'Surstock';

    const updated: StockRecord = {
      ...editingRecord,
      onHandQuantity: formOnHand,
      safetyStock: formSafety,
      maxStock: formMax,
      availableQuantity: avail,
      stockValue: val,
      coverageDays: cov,
      stockStatus: newStatus
    };

    if (onUpdateStockRecord) {
      onUpdateStockRecord(updated);
    }
    setEditingRecord(null);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Reference',
      'Designation',
      'Material_Planner',
      'Fournisseur_FRS',
      'Projet',
      'Emplacement',
      'Prix_Unitaire_EUR',
      'Stock_Physique_PCS',
      'Stock_Reserve_PCS',
      'Stock_Disponible_PCS',
      'Stock_Securite_PCS',
      'Stock_Max_PCS',
      'Valeur_Stock_EUR',
      'Couverture_Jours',
      'Stock_Dormant_PCS',
      'Valeur_Dormant_EUR',
      'Statut_Stock',
      'Dernier_Mouvement'
    ];

    const rows = filteredRecords.map(r => [
      `"${r.reference}"`,
      `"${r.designation}"`,
      `"${r.materialPlanner}"`,
      `"${r.supplier}"`,
      `"${r.project}"`,
      `"${r.storageLocation}"`,
      r.unitCost,
      r.onHandQuantity,
      r.reservedQuantity,
      r.availableQuantity,
      r.safetyStock,
      r.maxStock,
      r.stockValue,
      r.coverageDays,
      r.dormantStockQty,
      r.dormantStockValue,
      `"${r.stockStatus}"`,
      `"${r.lastMovementDate}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `suivi_stock_alstom_w35_${activeSubView}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Top Header & Sub-View Switcher */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-96 bg-amber-500/5 blur-3xl rounded-full pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase font-bold tracking-wider text-amber-400">
                Module 05 • Pilotage & Gestion des Approvisionnements
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-slate-300">
                Inventaire Actif : <span className="font-semibold text-white">Semaine 35 / 2026</span>
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Boxes className="h-7 w-7 text-amber-400" />
              Suivi de Stock (Material Planner, Fournisseurs & Global)
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Tableau de bord de contrôle des stocks : valorisation financière globale, analyse de la charge par Material Planner, suivi des stocks de sécurité fournisseurs (FRS) et résorption du stock dormant.
            </p>
          </div>

          {/* Sub-view switcher tabs */}
          <div className="flex items-center bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                setActiveSubView('global');
                setSelectedMP('all');
                setSelectedSupplier('all');
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeSubView === 'global'
                  ? 'bg-amber-600 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Boxes className="h-3.5 w-3.5" />
              <span>Vue Globale</span>
            </button>

            <button
              onClick={() => setActiveSubView('mp')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeSubView === 'mp'
                  ? 'bg-amber-600 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Par Material Planner</span>
            </button>

            <button
              onClick={() => setActiveSubView('frs')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeSubView === 'frs'
                  ? 'bg-amber-600 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Par Fournisseur (FRS)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Core Financial & Operational KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Stock Value */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">Valeur Totale du Stock</span>
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <Euro className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">
              {(totalStockValue / 1000000).toFixed(2)} M€
            </span>
            <span className="text-xs font-medium text-slate-400">
              {totalOnHandQty.toLocaleString('fr-FR')} pcs
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>{stockRecords.length} références actives</span>
            <span className="text-amber-400 font-mono text-[11px] font-semibold">Valorisation W35</span>
          </div>
        </div>

        {/* Card 2: Dormant Stock */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">Stock Dormant (&gt; 90 jours)</span>
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-400 font-mono">
              {(totalDormantValue / 1000).toFixed(0)} k€
            </span>
            <span className="text-xs font-medium text-rose-300">
              {totalStockValue > 0 ? ((totalDormantValue / totalStockValue) * 100).toFixed(1) : 0}% du stock
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>{totalDormantQty.toLocaleString('fr-FR')} pièces sans mouvement</span>
            <button
              onClick={() => setDormantOnly(!dormantOnly)}
              className="text-rose-400 hover:text-rose-300 text-[11px] font-semibold underline cursor-pointer"
            >
              {dormantOnly ? 'Voir tout' : 'Filtrer dormants'}
            </button>
          </div>
        </div>

        {/* Card 3: Stock Mini & Ruptures */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">Alertes Seuil Mini & Rupture</span>
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-400 font-mono">{alertMiniCount}</span>
            <span className="text-xs font-medium text-slate-400">
              références sous seuil
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Stock sécurité entamé</span>
            <span className="text-amber-400 text-[11px] font-semibold">Action Réappro</span>
          </div>
        </div>

        {/* Card 4: Average Coverage Days */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">Couverture Moyenne de Stock</span>
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400 font-mono">{averageCoverageDays}</span>
            <span className="text-xs font-medium text-emerald-300">
              Jours de production
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Optimal : 20 - 45 jours</span>
            <span className="text-emerald-400 text-[11px] font-semibold">Niveau Sain</span>
          </div>
        </div>
      </div>

      {/* SUB-VIEW 1: VUE GLOBALE */}
      {activeSubView === 'global' && (
        <div className="space-y-6">
          {/* Charts Row: Value by MP & Status Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Stock Value by MP */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                    <Users className="h-4 w-4 text-amber-400" />
                    Répartition de la Valeur de Stock par Material Planner (k€)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Valorisation totale gérée et part de stock dormant par gestionnaire
                  </p>
                </div>
                <button
                  onClick={() => setActiveSubView('mp')}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  Vue détaillée MP <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mpBarData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                    <XAxis dataKey="shortName" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${v}k€`} tickLine={false} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs shadow-2xl space-y-1 font-mono">
                              <div className="font-bold text-white">{data.name}</div>
                              <div className="text-amber-400">Stock Total : {data.valeurK} k€</div>
                              <div className="text-rose-400">Stock Dormant : {data.dormantK} k€</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="valeurK" name="Stock Actif (k€)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="dormantK" name="Stock Dormant (k€)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Status Breakdown Pie */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2 mb-1">
                  <Package className="h-4 w-4 text-emerald-400" />
                  Santé de l'Inventaire (Statuts)
                </h3>
                <p className="text-[11px] text-slate-400 mb-2">
                  Distribution des références par état de stock
                </p>
              </div>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs shadow-xl font-mono">
                              <div className="font-bold text-white">{d.name}</div>
                              <div style={{ color: d.color }}>{d.value} références</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-800">
                {statusPieData.map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-slate-300 truncate">{s.name} :</span>
                    <strong className="text-white ml-auto font-mono">{s.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: SUIVI PAR MATERIAL PLANNER */}
      {activeSubView === 'mp' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-400" />
                  Tableau de Bord par Material Planner
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sélectionnez un gestionnaire pour auditer son portefeuille d'approvisionnement et ses indicateurs de surstock.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Gestionnaire :</span>
                <select
                  value={selectedMP}
                  onChange={(e) => setSelectedMP(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">Tous les Material Planners (5)</option>
                  {MATERIAL_PLANNERS.map((mp) => (
                    <option key={mp.name} value={mp.name}>{mp.name} ({mp.code})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Grid of Material Planner Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 pt-2">
              {mpSummary.map((mp) => {
                const isSelected = selectedMP === mp.name;
                return (
                  <div
                    key={mp.name}
                    onClick={() => setSelectedMP(selectedMP === mp.name ? 'all' : mp.name)}
                    className={`rounded-xl p-4 border transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-500/80 shadow-lg shadow-amber-950/50'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white truncate">{mp.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                          {mp.totalRecords} réf.
                        </span>
                      </div>
                      <div className="text-lg font-black text-amber-400 font-mono">
                        {(mp.totalValue / 1000).toFixed(0)} k€
                      </div>
                      <span className="text-[11px] text-slate-400 block mb-3">Valeur gérée</span>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Stock Dormant :</span>
                        <span className="font-mono text-rose-400 font-bold">{(mp.dormantValue / 1000).toFixed(0)} k€ ({mp.dormantRate}%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Alertes Rupture :</span>
                        <span className={`font-mono font-bold ${mp.alerts > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {mp.alerts} réf.
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Couverture Moy. :</span>
                        <span className="font-mono text-slate-200 font-bold">{mp.avgCoverage} j</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: SUIVI PAR FOURNISSEUR (FRS) */}
      {activeSubView === 'frs' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-sky-400" />
                  Tableau de Bord Stock par Fournisseur (FRS)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Analyse des volumes de composants approvisionnés et immobilisations par équipementier ferroviaire.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Fournisseur :</span>
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 font-semibold focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="all">Tous les Fournisseurs (10)</option>
                  {KNOWN_SUPPLIERS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Top 5 Suppliers by Stock Value Table/Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
              {frsSummary.slice(0, 5).map((f) => (
                <div
                  key={f.supplier}
                  onClick={() => setSelectedSupplier(selectedSupplier === f.supplier ? 'all' : f.supplier)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                    selectedSupplier === f.supplier
                      ? 'bg-sky-950/40 border-sky-500/80 shadow-lg'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-white truncate mb-1">{f.supplier}</div>
                    <div className="text-base font-black text-sky-400 font-mono">
                      {(f.totalValue / 1000).toFixed(0)} k€
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] flex justify-between text-slate-400">
                    <span>{f.totalRecords} réf.</span>
                    <span className="text-slate-300 font-mono font-semibold">{f.onHandQuantity} pcs</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Global Filter Bar & Action Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par référence, désignation, MP, fournisseur, emplacement..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="all">Tous Statuts</option>
            <option value="Optimal">Optimal</option>
            <option value="Alerte Mini">Alerte Mini</option>
            <option value="Rupture Imminente">Rupture Imminente</option>
            <option value="Surstock">Surstock</option>
          </select>

          {/* Project filter */}
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="all">Tous Projets Ferroviaires</option>
            {PROJECTS.map(p => (
              <option key={p} value={p}>{p.replace('Alstom ', '')}</option>
            ))}
          </select>

          {/* Dormant filter toggle */}
          <button
            onClick={() => setDormantOnly(!dormantOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              dormantOnly
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-950'
                : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Dormants uniquement</span>
          </button>

          {/* Reset Filters */}
          {(searchQuery || selectedMP !== 'all' || selectedSupplier !== 'all' || selectedProject !== 'all' || selectedStatus !== 'all' || dormantOnly) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedMP('all');
                setSelectedSupplier('all');
                setSelectedProject('all');
                setSelectedStatus('all');
                setDormantOnly(false);
              }}
              className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Réinitialiser</span>
            </button>
          )}

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Stock Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Répertoire Détaillé des Stocks ({filteredRecords.length} articles répertoriés)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Valorisation affichée : <strong className="text-amber-400 font-mono">{(filteredRecords.reduce((sum, r) => sum + r.stockValue, 0) / 1000).toFixed(1)} k€</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800 font-semibold">
              <tr>
                <th className="py-3 px-4">Référence & Désignation</th>
                <th className="py-3 px-4">Material Planner</th>
                <th className="py-3 px-4">Fournisseur & Projet</th>
                <th className="py-3 px-4 text-right cursor-pointer select-none" onClick={() => { setSortField('onHandQuantity'); setSortAsc(!sortAsc); }}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Stock Phys. / Dispo</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Sécurité / Max</th>
                <th className="py-3 px-4 text-center cursor-pointer select-none" onClick={() => { setSortField('coverageDays'); setSortAsc(!sortAsc); }}>
                  <div className="flex items-center justify-center gap-1">
                    <span>Couverture</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right cursor-pointer select-none" onClick={() => { setSortField('dormantStockValue'); setSortAsc(!sortAsc); }}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Dormant (&gt;90j)</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right cursor-pointer select-none" onClick={() => { setSortField('stockValue'); setSortAsc(!sortAsc); }}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Valeur Stock (€)</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    Aucun article ne correspond aux critères de recherche.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  return (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition">
                      {/* Ref & Designation */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-white flex items-center gap-1.5">
                          <span>{r.reference}</span>
                          <span className="text-[10px] text-slate-500 font-normal bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                            {r.storageLocation}
                          </span>
                        </div>
                        <div className="text-slate-400 text-[11px] truncate max-w-xs">{r.designation}</div>
                      </td>

                      {/* Material Planner */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 text-[11px] font-semibold border border-slate-700/60">
                          <Users className="h-3 w-3 text-amber-400" />
                          {r.materialPlanner}
                        </span>
                      </td>

                      {/* Supplier & Project */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-200 font-semibold truncate max-w-xs">{r.supplier}</div>
                        <div className="text-slate-400 text-[10px] truncate max-w-xs">{r.project.replace('Alstom ', '')}</div>
                      </td>

                      {/* Physical & Available */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <div className="font-bold text-white">{r.onHandQuantity} pcs</div>
                        <div className="text-[10px] text-emerald-400 font-semibold">{r.availableQuantity} dispo</div>
                      </td>

                      {/* Safety & Max */}
                      <td className="py-3.5 px-4 text-center font-mono text-[11px] text-slate-300">
                        <span>{r.safetyStock}</span>
                        <span className="text-slate-600 mx-1">/</span>
                        <span>{r.maxStock}</span>
                      </td>

                      {/* Coverage Days */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-lg font-mono font-bold text-xs ${
                          r.coverageDays <= 5
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                            : r.coverageDays <= 15
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                            : r.coverageDays > 60
                            ? 'bg-purple-950/80 text-purple-300 border border-purple-800'
                            : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                        }`}>
                          {r.coverageDays} j
                        </span>
                      </td>

                      {/* Dormant Qty & Value */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        {r.dormantStockQty > 0 ? (
                          <div>
                            <span className="font-bold text-rose-400">{r.dormantStockQty} pcs</span>
                            <div className="text-[10px] text-rose-500 font-semibold">{r.dormantStockValue.toLocaleString('fr-FR')} €</div>
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Total Stock Value */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <span className="font-bold text-amber-400">{r.stockValue.toLocaleString('fr-FR')} €</span>
                        <div className="text-[10px] text-slate-500 font-normal">{r.unitCost} €/u</div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                          r.stockStatus === 'Optimal'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : r.stockStatus === 'Alerte Mini'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : r.stockStatus === 'Rupture Imminente'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                            : 'bg-purple-950 text-purple-300 border border-purple-800'
                        }`}>
                          {r.stockStatus}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleOpenEdit(r)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                          title="Ajuster le stock"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Edit Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Ajustement du Stock Article</h3>
                <span className="text-xs text-amber-400 font-mono">{editingRecord.reference} • {editingRecord.designation}</span>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Stock Physique Disponible (pcs)</label>
                <input
                  type="number"
                  min="0"
                  value={formOnHand}
                  onChange={(e) => setFormOnHand(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Stock de Sécurité Mini (pcs)</label>
                  <input
                    type="number"
                    min="0"
                    value={formSafety}
                    onChange={(e) => setFormSafety(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Stock Maximum Cible (pcs)</label>
                  <input
                    type="number"
                    min="0"
                    value={formMax}
                    onChange={(e) => setFormMax(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1 text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span>Material Planner :</span>
                  <strong className="text-white">{editingRecord.materialPlanner}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Fournisseur :</span>
                  <strong className="text-white">{editingRecord.supplier}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Nouvelle Valeur Estimée :</span>
                  <strong className="text-amber-400 font-mono font-bold">{(formOnHand * editingRecord.unitCost).toLocaleString('fr-FR')} €</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold cursor-pointer"
              >
                Enregistrer l'ajustement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
