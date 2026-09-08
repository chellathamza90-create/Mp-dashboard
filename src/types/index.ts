export type FolderKey = 'msp' | 'mdp' | 'pf' | 'otif';

export type FolderStatus = 'connected' | 'warning' | 'error';

export interface FolderConfig {
  id: FolderKey;
  name: string;
  code: string;
  folderName: string;
  url: string;
  status: FolderStatus;
  lastCheck: string | null;
  fileCount: number;
  latestPeriod: string;
  latencyMs?: number;
  errorMessage?: string;
}

export interface PublicFileMetadata {
  id: string;
  name: string;
  folderKey: FolderKey;
  url: string;
  sizeBytes: number;
  lastModified: string;
  hash: string;
  period: string; // e.g. "W35-2026" or "08-2026"
  periodType: 'week' | 'month';
  year: number;
  weekOrMonthNumber: number;
  processed: boolean;
  processedAt?: string;
  rowCount: number;
  status: 'synced' | 'pending' | 'modified' | 'error';
  isAmbiguousPeriod?: boolean;
}

export interface MSPRecord {
  id: string;
  fileId: string;
  week: number;
  year: number;
  periodLabel: string;
  reference: string;
  designation: string;
  supplier: string;
  missingQuantity: number;
  criticality: 'Critique' | 'Majeur' | 'Mineur';
  project: string;
  impactOrder: string;
  rootCause: string;
  promiseDate?: string;
  detectedDate: string;
}

export type ExceptionMessageCode = '10' | '15' | '20' | 'NONE';

export interface ExceptionMessageInfo {
  code: ExceptionMessageCode;
  label: string;
  description: string;
  actionRequired: string;
  severity: 'critical' | 'warning' | 'info';
  badgeColor: string;
}

export interface MDPRecord {
  id: string;
  fileId: string;
  week: number;
  year: number;
  periodLabel: string;
  reference: string;
  designation: string;
  supplier: string;
  status: 'Confirmé' | 'Non confirmé';
  confirmedDate?: string;
  needDate?: string; // Can be undefined / empty for Message 20 (Besoin à annuler)
  poNumber: string;
  contractNumber: string;
  quantity: number;
  unitCost?: number;
  totalAmount?: number;
  project: string;
  deltaDays: number; // positive = delay, negative = advance
  scheduleStatus: 'À l\'heure' | 'En retard' | 'En avance' | 'Non confirmé';
  evolution: 'Avance' | 'Report' | 'Stable' | 'Nouveau besoin';
  // MRP Exception Message fields
  exceptionCode: ExceptionMessageCode;
  exceptionLabel: string;
  exceptionAction: string;
  exceptionSeverity: 'critical' | 'warning' | 'info' | 'normal';
}

export interface PFRecord {
  id: string;
  fileId: string;
  week: number;
  year: number;
  periodLabel: string;
  pfReference: string;
  designation: string;
  project: string;
  deliveryDate: string;
  statusOF: 'Planifié' | 'En cours' | 'Livré' | 'En retard' | 'Bloqué';
  quantity: number;
  deliveredQuantity: number;
  customer: string;
  riskFactor: 'Faible' | 'Moyen' | 'Élevé';
}

export interface OTIFRecord {
  id: string;
  fileId: string;
  month: number;
  year: number;
  monthLabel: string;
  supplier: string;
  otifRate: number; // percentage 0 - 100
  totalLines: number;
  onTimeLines: number;
  project?: string;
  reference?: string;
  targetRate: number;
  category: 'Mécanique' | 'Électronique' | 'Fonderie' | 'Usinage' | 'Câblage';
}

export type StockStatus = 'Surstock' | 'Optimal' | 'Alerte Mini' | 'Rupture Imminente';

export interface StockRecord {
  id: string;
  reference: string;
  designation: string;
  materialPlanner: string; // e.g. "Thomas Laurent", "Sophie Bernard", "Marc Dubois", "Camille Robert", "Alexandre Petit"
  supplier: string; // e.g. "Knorr-Bremse Rail Systems", "Faiveley Transport (Wabtec)", ...
  project: string; // e.g. "Alstom Coradia Polyvalent", ...
  unitCost: number; // in €
  onHandQuantity: number; // Stock physique disponible en pcs
  reservedQuantity: number; // Stock réservé en pcs
  availableQuantity: number; // Stock net disponible (onHand - reserved)
  safetyStock: number; // Stock de sécurité mini en pcs
  maxStock: number; // Stock maximum cible en pcs
  stockValue: number; // onHandQuantity * unitCost (€)
  dailyConsumptionRate: number; // Consommation moyenne journalière (pcs/jour)
  coverageDays: number; // Couverture en jours (availableQuantity / dailyConsumptionRate)
  dormantStockQty: number; // Stock dormant (> 90 jours sans mouvement)
  dormantStockValue: number; // dormantStockQty * unitCost (€)
  stockStatus: StockStatus;
  lastMovementDate: string; // YYYY-MM-DD
  storageLocation: string; // e.g. "Magasin A-12", "Zone B-04"
}

export interface DataQualityIssue {
  id: string;
  folderKey: FolderKey;
  fileName: string;
  rowNumber?: number;
  issueType: 'missing_column' | 'invalid_date' | 'duplicate_row' | 'unknown_supplier' | 'format_error';
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export interface DataQualityReport {
  timestamp: string;
  filesAnalyzed: number;
  linesAnalyzed: number;
  errors: number;
  duplicates: number;
  missingColumns: number;
  invalidDates: number;
  unknownSuppliers: number;
  issues: DataQualityIssue[];
  qualityScore: number; // 0 to 100%
}

export interface SyncResult {
  timestamp: string;
  durationMs: number;
  totalFilesDetected: number;
  filesProcessed: number;
  newFilesCount: number;
  modifiedFilesCount: number;
  skippedFilesCount: number;
  errorCount: number;
  byFolder: Record<FolderKey, { detected: number; processed: number; newFiles: number; modified: number }>;
  qualityReport: DataQualityReport;
}

export type PeriodFilter = 
  | 'this_week'
  | 'prev_week'
  | 'last_4_weeks'
  | 'last_3_months'
  | 'last_6_months'
  | 'last_12_months'
  | 'all'
  | 'custom';

export type AutoRefreshInterval = 'startup' | '1h' | '6h' | '24h' | 'manual';
