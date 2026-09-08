import React, { useState } from 'react';
import { 
  X, 
  FolderOpen, 
  Plus, 
  FileSpreadsheet, 
  CheckCircle2, 
  Sparkles, 
  RefreshCw, 
  FileText,
  Upload,
  HardDrive
} from 'lucide-react';
import { FolderKey, PublicFileMetadata } from '../types';
import { DataPipelineService } from '../services/dataPipeline';

interface FolderSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: PublicFileMetadata[];
  onFilesChanged: () => void;
  onTriggerSync: () => void;
}

export const FolderSimulatorModal: React.FC<FolderSimulatorModalProps> = ({
  isOpen,
  onClose,
  files,
  onFilesChanged,
  onTriggerSync
}) => {
  const [activeFolder, setActiveFolder] = useState<FolderKey>('msp');
  const [customFileName, setCustomFileName] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const pipeline = DataPipelineService.getInstance();
  const folderFiles = files.filter((f) => f.folderKey === activeFolder);

  const folderTabs: { id: FolderKey; label: string; code: string }[] = [
    { id: 'msp', label: '01_MSP', code: 'Missing Parts' },
    { id: 'mdp', label: '02_MDP', code: 'Demand Planning' },
    { id: 'pf', label: '03_PRODUITS_FINIS', code: 'Produits Finis' },
    { id: 'otif', label: '04_OTIF', code: 'OTIF Mensuel' }
  ];

  const handleAddPresetFile = (fileName: string) => {
    pipeline.addNewFileToPublicFolder(activeFolder, fileName, 58);
    onFilesChanged();
    setNotification(`Fichier "${fileName}" ajouté avec succès au dossier public 01_${activeFolder.toUpperCase()} !`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleModifyFile = (fileId: string) => {
    const mod = pipeline.modifyExistingFile(fileId);
    if (mod) {
      onFilesChanged();
      setNotification(`Fichier "${mod.name}" marqué comme modifié (nouvelle empreinte/taille). Prêt pour synchronisation incrémentale.`);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleAddCustomFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFileName.trim()) return;
    let name = customFileName.trim();
    if (!name.endsWith('.xlsx')) name += '.xlsx';

    pipeline.addNewFileToPublicFolder(activeFolder, name, 60);
    setCustomFileName('');
    onFilesChanged();
    setNotification(`Fichier personnalisé "${name}" déposé dans le dossier public.`);
    setTimeout(() => setNotification(null), 4000);
  };

  // Drag and drop real files
  const handleDropFiles = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        pipeline.addNewFileToPublicFolder(activeFolder, file.name, 65);
      }
      onFilesChanged();
      setNotification(`${e.dataTransfer.files.length} fichier(s) déposé(s) dans le dossier public !`);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        id="modal-public-folders-explorer"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
              <FolderOpen className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Explorateur des 4 Dossiers Publics</h3>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Cloud Storage Public
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Visualisez les fichiers publics, déposez de nouveaux fichiers ou modifiez un fichier existant pour tester la détection automatique
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            id="btn-close-folder-modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className="bg-sky-950 border-b border-sky-800 px-6 py-2.5 text-sky-200 text-xs flex items-center gap-2 animate-fadeIn">
            <Sparkles className="h-4 w-4 text-sky-400 flex-shrink-0" />
            <span className="font-medium">{notification}</span>
          </div>
        )}

        {/* Folder Select Tabs */}
        <div className="bg-slate-950/70 px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {folderTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveFolder(t.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                  activeFolder === t.id
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                id={`tab-folder-${t.id}`}
              >
                <FolderOpen className="h-3.5 w-3.5" />
                <span>📁 {t.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/60 font-mono">
                  {files.filter((f) => f.folderKey === t.id).length}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onTriggerSync();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer"
              id="btn-trigger-sync-from-modal"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Synchroniser maintenant</span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Quick Simulation Action Bar (Requirements 38, 41, 48) */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                Actions de test & Simulation de dépôt de fichiers
              </span>
              <span className="text-[11px] text-slate-400">
                Prouve la détection sans modifier le code (Règle 48)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {activeFolder === 'msp' && (
                <>
                  <button
                    onClick={() => handleAddPresetFile('MSP_Semaine_36_2026.xlsx')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    + Déposer MSP_Semaine_36_2026.xlsx (Nouveau 🆕)
                  </button>
                  <button
                    onClick={() => handleAddPresetFile('MSP_Semaine_37_2026.xlsx')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    + Déposer MSP_Semaine_37_2026.xlsx
                  </button>
                  <button
                    onClick={() => {
                      const w35 = folderFiles.find((f) => f.name.includes('35'));
                      if (w35) handleModifyFile(w35.id);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-950/60 hover:bg-amber-900/80 text-amber-200 border border-amber-800/50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Simuler modification MSP W35 (1250 → 1180)
                  </button>
                </>
              )}

              {activeFolder === 'mdp' && (
                <>
                  <button
                    onClick={() => handleAddPresetFile('MDP_Semaine_36_2026.xlsx')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    + Déposer MDP_Semaine_36_2026.xlsx (Nouveau 🆕)
                  </button>
                  <button
                    onClick={() => handleAddPresetFile('MDP_Semaine_37_2026.xlsx')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    + Déposer MDP_Semaine_37_2026.xlsx
                  </button>
                </>
              )}

              {activeFolder === 'pf' && (
                <>
                  <button
                    onClick={() => handleAddPresetFile('PF_Semaine_36_2026.xlsx')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    + Déposer PF_Semaine_36_2026.xlsx (Nouveau 🆕)
                  </button>
                  <button
                    onClick={() => handleAddPresetFile('PF_Semaine_37_2026.xlsx')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    + Déposer PF_Semaine_37_2026.xlsx
                  </button>
                </>
              )}

              {activeFolder === 'otif' && (
                <>
                  <button
                    onClick={() => handleAddPresetFile('OTIF_Septembre_2026.xlsx')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    + Déposer OTIF_Septembre_2026.xlsx (Nouveau 🆕)
                  </button>
                  <button
                    onClick={() => handleAddPresetFile('OTIF_Octobre_2026.xlsx')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    + Déposer OTIF_Octobre_2026.xlsx
                  </button>
                </>
              )}
            </div>

            {/* Custom file name input & Drag and Drop zone */}
            <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col md:flex-row gap-3">
              <form onSubmit={handleAddCustomFile} className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder={`Nom personnalise, ex: ${activeFolder.toUpperCase()}_W38_2026.xlsx`}
                  value={customFileName}
                  onChange={(e) => setCustomFileName(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-medium cursor-pointer"
                >
                  Ajouter au dossier
                </button>
              </form>

              {/* Drag Drop Area */}
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDropFiles}
                className="border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-lg p-2 text-center text-xs text-slate-400 flex items-center justify-center gap-2 cursor-pointer transition"
              >
                <Upload className="h-3.5 w-3.5 text-sky-400" />
                <span>Glisser-déposer un vrai fichier .xlsx</span>
              </div>
            </div>
          </div>

          {/* Files Table in this Folder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Fichiers présents dans le dossier public ({folderFiles.length})
              </h4>
              <span className="text-xs text-slate-400 font-mono">
                Storage Path : /public/supply-chain/0{activeFolder === 'msp' ? 1 : activeFolder === 'mdp' ? 2 : activeFolder === 'pf' ? 3 : 4}_{activeFolder.toUpperCase()}
              </span>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">Nom du Fichier</th>
                    <th className="px-4 py-2.5">Période Détectée</th>
                    <th className="px-4 py-2.5">Taille</th>
                    <th className="px-4 py-2.5">Horodatage</th>
                    <th className="px-4 py-2.5">Statut Pipeline</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {folderFiles.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-4 py-2.5 flex items-center gap-2 font-mono text-slate-200">
                        <FileSpreadsheet className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                        <span>{f.name}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-sky-300">
                          {f.period}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 font-mono">
                        {(f.sizeBytes / 1024).toFixed(1)} KB
                      </td>
                      <td className="px-4 py-2.5 text-slate-400">
                        {new Date(f.lastModified).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-2.5">
                        {f.status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-950 border border-indigo-700 text-indigo-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping" />
                            NOUVEAU 🆕
                          </span>
                        ) : f.status === 'modified' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-950 border border-amber-700 text-amber-300">
                            <RefreshCw className="h-3 w-3 animate-spin text-amber-400" />
                            MODIFIÉ 🔄
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Traité ✓
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {f.status === 'synced' && (
                          <button
                            onClick={() => handleModifyFile(f.id)}
                            className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                          >
                            Simuler modif
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <HardDrive className="h-4 w-4 text-sky-400" />
            <span>Chaque fichier déposé ici est automatiquement lu lors de la synchronisation</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
