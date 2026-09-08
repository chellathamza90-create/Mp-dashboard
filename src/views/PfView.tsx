import React, { useState } from 'react';
import { 
  Plane, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Search, 
  Filter, 
  FolderOpen, 
  TrendingUp, 
  Building
} from 'lucide-react';
import { PFRecord, PublicFileMetadata } from '../types';

interface PfViewProps {
  records: PFRecord[];
  files: PublicFileMetadata[];
  onOpenFolderModal: () => void;
}

export const PfView: React.FC<PfViewProps> = ({
  records,
  files,
  onOpenFolderModal
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');

  const pfFiles = files.filter((f) => f.folderKey === 'pf');

  // Filter records
  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.pfReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customer.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = selectedStatus === 'all' || r.statusOF === selectedStatus;
    const matchesProject = selectedProject === 'all' || r.project === selectedProject;

    return matchesSearch && matchesStatus && matchesProject;
  });

  // KPI Calculations
  const deliveredCount = records.filter((r) => r.statusOF === 'Livré').length;
  const inProgressCount = records.filter((r) => r.statusOF === 'En cours').length;
  const plannedCount = records.filter((r) => r.statusOF === 'Planifié').length;
  const overdueCount = records.filter((r) => r.statusOF === 'En retard' || r.statusOF === 'Bloqué').length;

  const totalDeliveredQty = records.reduce((acc, r) => acc + r.deliveredQuantity, 0);
  const totalTargetQty = records.reduce((acc, r) => acc + r.quantity, 0);

  // Project Breakdown
  const projectStats: Record<string, { total: number; delivered: number; delayed: number }> = {};
  records.forEach((r) => {
    if (!projectStats[r.project]) {
      projectStats[r.project] = { total: 0, delivered: 0, delayed: 0 };
    }
    projectStats[r.project].total += 1;
    if (r.statusOF === 'Livré') projectStats[r.project].delivered += 1;
    if (r.statusOF === 'En retard' || r.statusOF === 'Bloqué') projectStats[r.project].delayed += 1;
  });

  const projects = Object.keys(projectStats);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase font-bold tracking-wider text-amber-400">
              03_PRODUITS_FINIS — Suivi de Livraison & OF
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs text-slate-300 font-mono">
              {pfFiles.length} fichiers hebdomadaires archivés
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">
            Calendrier des Livraisons & Pilotage des Produits Finis (PF)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Reconstitution automatique du calendrier des livraisons, suivi des ordres de fabrication (OF) et analyse d'adhérence par projet.
          </p>
        </div>

        <button
          onClick={onOpenFolderModal}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-semibold flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <FolderOpen className="h-4 w-4" />
          <span>Explorer 03_PRODUITS_FINIS ({pfFiles.length} fichiers)</span>
        </button>
      </div>

      {/* 4 KPI Counters: Calendrier des livraisons (Prompt 49 & 36) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-emerald-900/50 bg-emerald-950/10 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
            <span>Produits Finis Livrés</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">{deliveredCount}</div>
          <span className="text-[11px] text-emerald-300/70 mt-1 block">
            {totalDeliveredQty} unités expédiées
          </span>
        </div>

        <div className="bg-slate-900 border border-sky-900/50 bg-sky-950/10 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-sky-400 font-medium">
            <span>Produits Finis À Venir</span>
            <Clock className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-sky-400 font-mono mt-1">{inProgressCount + plannedCount}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {inProgressCount} en cours, {plannedCount} planifiés
          </span>
        </div>

        <div className="bg-slate-900 border border-rose-900/50 bg-rose-950/10 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-rose-400 font-medium">
            <span>Produits Finis en Retard</span>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-rose-400 font-mono mt-1">{overdueCount}</div>
          <span className="text-[11px] text-rose-300/70 mt-1 block">
            Dont {records.filter((r) => r.statusOF === 'Bloqué').length} bloqués par manquants
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Taux de Ponctualité PF</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-white font-mono mt-1">
            {Math.round(((records.length - overdueCount) / Math.max(1, records.length)) * 100)}%
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Sur {records.length} OFs totaux</span>
        </div>
      </div>

      {/* Analysis By Project (Prompt 36) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
          <Building className="h-4 w-4 text-amber-400" />
          Analyse par Projet & Tendance des Livraisons
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => {
            const stats = projectStats[proj];
            const deliveredRate = Math.round((stats.delivered / stats.total) * 100);
            return (
              <div key={proj} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white truncate">{proj}</h4>
                  <span className="text-[11px] font-mono text-slate-400">{stats.total} OF</span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Avancement des livraisons</span>
                    <span className="text-emerald-400 font-bold">{deliveredRate}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full"
                      style={{ width: `${deliveredRate}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                  <span className="text-slate-400">Retards :</span>
                  <span className={`font-mono font-bold ${stats.delayed > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {stats.delayed} OF
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher référence PF, désignation, client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">Tous statuts OF</option>
            <option value="Livré">Livré</option>
            <option value="En cours">En cours</option>
            <option value="Planifié">Planifié</option>
            <option value="En retard">En retard</option>
            <option value="Bloqué">Bloqué</option>
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

      {/* Table of Finished Goods */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Calendrier Détaillé des Produits Finis ({filteredRecords.length})
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Synchronisation continue 03_PRODUITS_FINIS
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Référence PF</th>
                <th className="px-4 py-3">Désignation</th>
                <th className="px-4 py-3">Projet</th>
                <th className="px-4 py-3">Date de Livraison</th>
                <th className="px-4 py-3">Statut OF / PF</th>
                <th className="px-4 py-3">Quantité Cible</th>
                <th className="px-4 py-3">Quantité Livrée</th>
                <th className="px-4 py-3">Client Destinataire</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3 font-mono font-bold text-amber-400">
                    {r.pfReference}
                  </td>
                  <td className="px-4 py-3 text-slate-200 font-medium">
                    {r.designation}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {r.project}
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-slate-200">
                    {r.deliveryDate}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      r.statusOF === 'Livré'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : r.statusOF === 'En cours'
                        ? 'bg-sky-950 text-sky-300 border border-sky-800'
                        : r.statusOF === 'Planifié'
                        ? 'bg-slate-800 text-slate-300'
                        : r.statusOF === 'Bloqué'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {r.statusOF}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-100">
                    {r.quantity}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                    {r.deliveredQuantity}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {r.customer}
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
