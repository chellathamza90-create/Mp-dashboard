/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { StorageService } from './services/storageService';
import { DataPipelineService, SyncProgressUpdate } from './services/dataPipeline';
import { 
  FolderConfig, 
  PublicFileMetadata, 
  MSPRecord, 
  MDPRecord, 
  PFRecord, 
  OTIFRecord, 
  StockRecord,
  PeriodFilter, 
  DataQualityReport 
} from './types';

import { Header } from './components/Header';
import { SyncProgressBanner } from './components/SyncProgressBanner';
import { DataQualityModal } from './components/DataQualityModal';
import { FolderSimulatorModal } from './components/FolderSimulatorModal';

import { ControlTowerView } from './views/ControlTowerView';
import { MspView } from './views/MspView';
import { MdpView } from './views/MdpView';
import { VariationPlanningView } from './views/VariationPlanningView';
import { OtifView } from './views/OtifView';
import { StockView } from './views/StockView';
import { PfView } from './views/PfView';
import { DataSourcesView } from './views/DataSourcesView';

export default function App() {
  const storage = StorageService.getInstance();
  const pipeline = DataPipelineService.getInstance();

  // Navigation State
  const [currentTab, setCurrentTab] = useState<string>('tower');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>('this_week');

  // Core Pipeline State
  const [folders, setFolders] = useState<FolderConfig[]>(() => storage.getFolders());
  const [files, setFiles] = useState<PublicFileMetadata[]>(() => storage.getPublicFiles());
  const [mspRecords, setMspRecords] = useState<MSPRecord[]>(() => storage.getMSPRecords());
  const [mdpRecords, setMdpRecords] = useState<MDPRecord[]>(() => storage.getMDPRecords());
  const [pfRecords, setPfRecords] = useState<PFRecord[]>(() => storage.getPFRecords());
  const [otifRecords, setOtifRecords] = useState<OTIFRecord[]>(() => storage.getOTIFRecords());
  const [stockRecords, setStockRecords] = useState<StockRecord[]>(() => storage.getStockRecords());
  const [lastSyncDate, setLastSyncDate] = useState<string>(() => storage.getLastSync());
  const [qualityReport, setQualityReport] = useState<DataQualityReport>(() => storage.getQualityReport());

  // Sync Progress State
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgressUpdate | null>(null);
  const [lastSyncSummary, setLastSyncSummary] = useState<string | null>(null);

  // Modals
  const [isQualityModalOpen, setIsQualityModalOpen] = useState<boolean>(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState<boolean>(false);

  // Reload local state from storage
  const refreshFromStorage = useCallback(() => {
    setFolders(storage.getFolders());
    setFiles(storage.getPublicFiles());
    setMspRecords(storage.getMSPRecords());
    setMdpRecords(storage.getMDPRecords());
    setPfRecords(storage.getPFRecords());
    setOtifRecords(storage.getOTIFRecords());
    setStockRecords(storage.getStockRecords());
    setLastSyncDate(storage.getLastSync());
    setQualityReport(storage.getQualityReport());
  }, [storage]);

  // Handler for updating stock record
  const handleUpdateStockRecord = useCallback((updated: StockRecord) => {
    setStockRecords((prev) => {
      const next = prev.map((r) => (r.id === updated.id ? updated : r));
      storage.saveStockRecords(next);
      return next;
    });
  }, [storage]);

  // Execute Auto Data Sync (Requirement 37 & 38)
  const handleTriggerSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncProgress({
      stepIndex: 1,
      totalSteps: 9,
      stepName: 'Initialisation du scan',
      detail: 'Connexion aux 4 dossiers publics...'
    });

    try {
      const result = await pipeline.executeDataSync((update) => {
        setSyncProgress(update);
      });

      refreshFromStorage();

      let summaryText = `Synchronisation réussie (${result.durationMs}ms) : ${result.totalFilesDetected} fichiers vérifiés.`;
      if (result.newFilesCount > 0 || result.modifiedFilesCount > 0) {
        summaryText += ` ${result.newFilesCount} nouveau(x) fichier(s) ingéré(s), ${result.modifiedFilesCount} fichier(s) mis à jour sans doublons.`;
      } else {
        summaryText += ` Toutes les données sont à jour (aucun nouveau fichier détecté).`;
      }
      setLastSyncSummary(summaryText);
    } catch (err: any) {
      setLastSyncSummary(`Erreur lors de la synchronisation : ${err.message || 'Échec'}`);
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  }, [isSyncing, pipeline, refreshFromStorage]);

  // Sync is triggered explicitly by the user clicking the Sync button

  const pendingNewFilesCount = files.filter((f) => f.status === 'pending' || f.status === 'modified').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Header with discrete data freshness & navigation */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        lastSyncDate={lastSyncDate}
        isSyncing={isSyncing}
        onTriggerSync={handleTriggerSync}
        selectedPeriod={selectedPeriod}
        setSelectedPeriod={setSelectedPeriod}
        onOpenQualityModal={() => setIsQualityModalOpen(true)}
        onOpenFolderModal={() => setIsFolderModalOpen(true)}
        pendingNewFilesCount={pendingNewFilesCount}
      />

      {/* Sync Step-by-Step Progress & Result Banner */}
      <SyncProgressBanner
        progress={syncProgress}
        isSyncing={isSyncing}
        lastResultSummary={lastSyncSummary}
        onDismissSummary={() => setLastSyncSummary(null)}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        {currentTab === 'tower' && (
          <ControlTowerView
            mspRecords={mspRecords}
            mdpRecords={mdpRecords}
            pfRecords={pfRecords}
            otifRecords={otifRecords}
            stockRecords={stockRecords}
            folders={folders}
            selectedPeriod={selectedPeriod}
            onNavigateTab={(tab) => setCurrentTab(tab)}
            onOpenQualityModal={() => setIsQualityModalOpen(true)}
          />
        )}

        {currentTab === 'msp' && (
          <MspView
            records={mspRecords}
            files={files}
            onOpenFolderModal={() => setIsFolderModalOpen(true)}
          />
        )}

        {currentTab === 'mdp' && (
          <MdpView
            records={mdpRecords}
            files={files}
            onOpenFolderModal={() => setIsFolderModalOpen(true)}
          />
        )}

        {currentTab === 'variation' && (
          <VariationPlanningView
            mdpRecords={mdpRecords}
            mspRecords={mspRecords}
            pfRecords={pfRecords}
          />
        )}

        {currentTab === 'otif' && (
          <OtifView
            records={otifRecords}
            files={files}
            onOpenFolderModal={() => setIsFolderModalOpen(true)}
          />
        )}

        {currentTab === 'stock' && (
          <StockView
            stockRecords={stockRecords}
            onUpdateStockRecord={handleUpdateStockRecord}
          />
        )}

        {currentTab === 'pf' && (
          <PfView
            records={pfRecords}
            files={files}
            onOpenFolderModal={() => setIsFolderModalOpen(true)}
          />
        )}

        {currentTab === 'sources' && (
          <DataSourcesView
            folders={folders}
            files={files}
            lastSyncDate={lastSyncDate}
            isSyncing={isSyncing}
            onTriggerSync={handleTriggerSync}
            onOpenQualityModal={() => setIsQualityModalOpen(true)}
            onOpenFolderModal={() => setIsFolderModalOpen(true)}
            onFoldersUpdated={(updated) => setFolders(updated)}
          />
        )}
      </main>

      {/* Data Quality Report Modal (Requirement 46) */}
      <DataQualityModal
        isOpen={isQualityModalOpen}
        onClose={() => setIsQualityModalOpen(false)}
        report={qualityReport}
      />

      {/* Public Folders Live Explorer & File Drop Simulator (Requirements 36, 38, 41, 48) */}
      <FolderSimulatorModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        files={files}
        onFilesChanged={refreshFromStorage}
        onTriggerSync={handleTriggerSync}
      />
    </div>
  );
}
