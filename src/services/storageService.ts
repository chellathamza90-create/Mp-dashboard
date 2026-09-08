import {
  FolderConfig,
  PublicFileMetadata,
  MSPRecord,
  MDPRecord,
  PFRecord,
  OTIFRecord,
  DataQualityReport,
  SyncResult,
  AutoRefreshInterval
} from '../types';
import {
  DEFAULT_FOLDERS,
  generateInitialMsp,
  generateInitialMdp,
  generateInitialPf,
  generateInitialOtif,
  getInitialQualityReport
} from './initialData';

const STORAGE_KEYS = {
  FOLDERS: 'mpt_folders_v2',
  PUBLIC_FILES: 'mpt_public_files_v2',
  MSP_RECORDS: 'mpt_msp_records_v2',
  MDP_RECORDS: 'mpt_mdp_records_v2',
  PF_RECORDS: 'mpt_pf_records_v2',
  OTIF_RECORDS: 'mpt_otif_records_v2',
  LAST_SYNC: 'mpt_last_sync_v2',
  SYNC_HISTORY: 'mpt_sync_history_v2',
  QUALITY_REPORT: 'mpt_quality_report_v2',
  AUTO_REFRESH: 'mpt_auto_refresh_v2'
};

export class StorageService {
  private static instance: StorageService;

  private constructor() {
    this.ensureInitialized();
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private ensureInitialized(): void {
    if (!localStorage.getItem(STORAGE_KEYS.FOLDERS)) {
      this.resetToDefaults();
    }
  }

  public resetToDefaults(): void {
    const msp = generateInitialMsp();
    const mdp = generateInitialMdp();
    const pf = generateInitialPf();
    const otif = generateInitialOtif();

    const allFiles = [...msp.files, ...mdp.files, ...pf.files, ...otif.files];
    const totalLines = allFiles.reduce((acc, f) => acc + f.rowCount, 0) * 1500;

    localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(DEFAULT_FOLDERS));
    localStorage.setItem(STORAGE_KEYS.PUBLIC_FILES, JSON.stringify(allFiles));
    localStorage.setItem(STORAGE_KEYS.MSP_RECORDS, JSON.stringify(msp.records));
    localStorage.setItem(STORAGE_KEYS.MDP_RECORDS, JSON.stringify(mdp.records));
    localStorage.setItem(STORAGE_KEYS.PF_RECORDS, JSON.stringify(pf.records));
    localStorage.setItem(STORAGE_KEYS.OTIF_RECORDS, JSON.stringify(otif.records));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, '2026-09-06T22:30:00.000Z');
    localStorage.setItem(STORAGE_KEYS.AUTO_REFRESH, JSON.stringify({ enabled: true, interval: 'startup' as AutoRefreshInterval }));
    localStorage.setItem(STORAGE_KEYS.QUALITY_REPORT, JSON.stringify(getInitialQualityReport(allFiles.length, 125430)));
    localStorage.setItem(STORAGE_KEYS.SYNC_HISTORY, JSON.stringify([
      {
        timestamp: '2026-09-06T22:30:00.000Z',
        durationMs: 1240,
        totalFilesDetected: 80,
        filesProcessed: 80,
        newFilesCount: 4,
        modifiedFilesCount: 0,
        skippedFilesCount: 76,
        errorCount: 0,
        byFolder: {
          msp: { detected: 24, processed: 24, newFiles: 1, modified: 0 },
          mdp: { detected: 24, processed: 24, newFiles: 1, modified: 0 },
          pf: { detected: 20, processed: 20, newFiles: 1, modified: 0 },
          otif: { detected: 12, processed: 12, newFiles: 1, modified: 0 }
        },
        qualityReport: getInitialQualityReport(80, 125430)
      } as SyncResult
    ]));
  }

  public getFolders(): FolderConfig[] {
    const raw = localStorage.getItem(STORAGE_KEYS.FOLDERS);
    return raw ? JSON.parse(raw) : DEFAULT_FOLDERS;
  }

  public saveFolders(folders: FolderConfig[]): void {
    localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
  }

  public getPublicFiles(): PublicFileMetadata[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PUBLIC_FILES);
    return raw ? JSON.parse(raw) : [];
  }

  public savePublicFiles(files: PublicFileMetadata[]): void {
    localStorage.setItem(STORAGE_KEYS.PUBLIC_FILES, JSON.stringify(files));
  }

  public getMSPRecords(): MSPRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MSP_RECORDS);
    return raw ? JSON.parse(raw) : [];
  }

  public saveMSPRecords(records: MSPRecord[]): void {
    localStorage.setItem(STORAGE_KEYS.MSP_RECORDS, JSON.stringify(records));
  }

  public getMDPRecords(): MDPRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MDP_RECORDS);
    return raw ? JSON.parse(raw) : [];
  }

  public saveMDPRecords(records: MDPRecord[]): void {
    localStorage.setItem(STORAGE_KEYS.MDP_RECORDS, JSON.stringify(records));
  }

  public getPFRecords(): PFRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PF_RECORDS);
    return raw ? JSON.parse(raw) : [];
  }

  public savePFRecords(records: PFRecord[]): void {
    localStorage.setItem(STORAGE_KEYS.PF_RECORDS, JSON.stringify(records));
  }

  public getOTIFRecords(): OTIFRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.OTIF_RECORDS);
    return raw ? JSON.parse(raw) : [];
  }

  public saveOTIFRecords(records: OTIFRecord[]): void {
    localStorage.setItem(STORAGE_KEYS.OTIF_RECORDS, JSON.stringify(records));
  }

  public getLastSync(): string {
    return localStorage.getItem(STORAGE_KEYS.LAST_SYNC) || '2026-09-06T22:30:00.000Z';
  }

  public setLastSync(isoDate: string): void {
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, isoDate);
  }

  public getQualityReport(): DataQualityReport {
    const raw = localStorage.getItem(STORAGE_KEYS.QUALITY_REPORT);
    return raw ? JSON.parse(raw) : getInitialQualityReport(80, 125430);
  }

  public saveQualityReport(report: DataQualityReport): void {
    localStorage.setItem(STORAGE_KEYS.QUALITY_REPORT, JSON.stringify(report));
  }

  public getSyncHistory(): SyncResult[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SYNC_HISTORY);
    return raw ? JSON.parse(raw) : [];
  }

  public addSyncHistory(res: SyncResult): void {
    const history = this.getSyncHistory();
    history.unshift(res);
    if (history.length > 25) history.pop();
    localStorage.setItem(STORAGE_KEYS.SYNC_HISTORY, JSON.stringify(history));
  }

  public getAutoRefresh(): { enabled: boolean; interval: AutoRefreshInterval } {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTO_REFRESH);
    return raw ? JSON.parse(raw) : { enabled: true, interval: 'startup' };
  }

  public saveAutoRefresh(config: { enabled: boolean; interval: AutoRefreshInterval }): void {
    localStorage.setItem(STORAGE_KEYS.AUTO_REFRESH, JSON.stringify(config));
  }
}
