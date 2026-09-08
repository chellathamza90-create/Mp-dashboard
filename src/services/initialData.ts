import { PublicFileMetadata, MSPRecord, MDPRecord, PFRecord, OTIFRecord, StockRecord, DataQualityReport, FolderConfig } from '../types';
import { evaluateMrpException } from '../utils/mrpExceptions';

export const KNOWN_SUPPLIERS = [
  'Knorr-Bremse Rail Systems',
  'Faiveley Transport (Wabtec)',
  'ABB Traction & Drives',
  'SKF Railway Bearings',
  'Sécheron SA',
  'Voith Turbo Rail',
  'Compin-Flabel Rail Seating',
  'Schaltbau Railway Products',
  'Lucchini RS Wheelsets',
  'Stadler Rail Components'
];

export const MATERIAL_PLANNERS = [
  { name: 'Thomas Laurent', code: 'MP-TL', role: 'Lead Material Planner', email: 'thomas.laurent@alstom-rail.com' },
  { name: 'Sophie Bernard', code: 'MP-SB', role: 'Senior Material Planner', email: 'sophie.bernard@alstom-rail.com' },
  { name: 'Marc Dubois', code: 'MP-MD', role: 'Material Planner Freinage & Bogies', email: 'marc.dubois@alstom-rail.com' },
  { name: 'Camille Robert', code: 'MP-CR', role: 'Material Planner Électronique & Traction', email: 'camille.robert@alstom-rail.com' },
  { name: 'Alexandre Petit', code: 'MP-AP', role: 'Material Planner Intérieurs & Aménagements', email: 'alexandre.petit@alstom-rail.com' }
];

export const PROJECTS = [
  'Alstom Coradia Polyvalent',
  'Alstom Citadis Dualis',
  'Alstom Avelia Horizon TGV M',
  'Alstom Metropolis Metro',
  'Alstom Traxx MS3 Locomotive'
];

export const DEFAULT_FOLDERS: FolderConfig[] = [
  {
    id: 'msp',
    name: 'MSP — Missing Parts',
    code: '01_MSP',
    folderName: '01_MSP',
    url: 'https://storage.enterprise-cloud.net/public/supply-chain/01_MSP',
    status: 'connected',
    lastCheck: '2026-09-06T15:00:00.000Z',
    fileCount: 24,
    latestPeriod: 'Semaine 35 / 2026',
    latencyMs: 42
  },
  {
    id: 'mdp',
    name: 'MDP — Material Demand Planning',
    code: '02_MDP',
    folderName: '02_MDP',
    url: 'https://storage.enterprise-cloud.net/public/supply-chain/02_MDP',
    status: 'connected',
    lastCheck: '2026-09-06T15:00:00.000Z',
    fileCount: 24,
    latestPeriod: 'Semaine 35 / 2026',
    latencyMs: 38
  },
  {
    id: 'pf',
    name: 'Produits Finis (PF)',
    code: '03_PRODUITS_FINIS',
    folderName: '03_PRODUITS_FINIS',
    url: 'https://storage.enterprise-cloud.net/public/supply-chain/03_PRODUITS_FINIS',
    status: 'connected',
    lastCheck: '2026-09-06T15:00:00.000Z',
    fileCount: 20,
    latestPeriod: 'Semaine 35 / 2026',
    latencyMs: 51
  },
  {
    id: 'otif',
    name: 'OTIF Fournisseurs',
    code: '04_OTIF',
    folderName: '04_OTIF',
    url: 'https://storage.enterprise-cloud.net/public/supply-chain/04_OTIF',
    status: 'connected',
    lastCheck: '2026-09-06T15:00:00.000Z',
    fileCount: 12,
    latestPeriod: 'Août 2026',
    latencyMs: 45
  }
];

export const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

/**
 * Generate initial 24 MSP weekly files and records
 */
export function generateInitialMsp(): { files: PublicFileMetadata[]; records: MSPRecord[] } {
  const files: PublicFileMetadata[] = [];
  const records: MSPRecord[] = [];

  const parts = [
    { ref: 'REF-HYD-4091', des: 'Vérin hydraulique principal', crit: 'Critique', cause: 'Rupture matière première fonderie' },
    { ref: 'REF-ACT-8820', des: 'Actionneur électromécanique', crit: 'Critique', cause: 'Non-conformité banc d\'essais' },
    { ref: 'REF-VALV-1204', des: 'Electrovanne de freinage d\'urgence', crit: 'Majeur', cause: 'Capacité machine saturée' },
    { ref: 'REF-CAP-3310', des: 'Capteur de vitesse bogie (odométrie)', crit: 'Mineur', cause: 'Délai d\'étalonnage métrologie' },
    { ref: 'REF-FIB-7700', des: 'Panneau d\'habillage polyester ignifugé', crit: 'Majeur', cause: 'Retard polymérisation' },
    { ref: 'REF-CON-9021', des: 'Faisceau connectique blindé', crit: 'Critique', cause: 'Pénurie connecteurs industriels' },
    { ref: 'REF-ROU-5541', des: 'Roulement de boîte d\'essieu', crit: 'Majeur', cause: 'Contrôle qualité fournisseur' },
    { ref: 'REF-VIS-1088', des: 'Boulonnerie haute résistance ferroviaire', crit: 'Mineur', cause: 'Retard de livraison transporteur' }
  ];

  for (let w = 12; w <= 35; w++) {
    const fileId = `msp-w${w}-2026`;
    const weekStr = w < 10 ? `0${w}` : `${w}`;
    const fileName = `MSP_Semaine_${weekStr}_2026.xlsx`;
    const dateStr = `2026-${Math.floor((w - 1) / 4) + 3 > 9 ? Math.floor((w - 1) / 4) + 3 : '0' + (Math.floor((w - 1) / 4) + 3)}-15T08:30:00.000Z`;

    // Row count varies from 45 to 68 missing parts per week
    const rowCount = 48 + ((w * 7) % 20);

    files.push({
      id: fileId,
      name: fileName,
      folderKey: 'msp',
      url: `https://storage.enterprise-cloud.net/public/supply-chain/01_MSP/${fileName}`,
      sizeBytes: 145000 + (w * 3120),
      lastModified: dateStr,
      hash: `md5_msp_w${w}_` + (145000 + w * 3120),
      period: `W${weekStr}-2026`,
      periodType: 'week',
      year: 2026,
      weekOrMonthNumber: w,
      processed: true,
      processedAt: '2026-09-06T15:00:00.000Z',
      rowCount,
      status: 'synced'
    });

    // Create realistic records for the week
    const countForWeek = Math.min(rowCount, 8);
    for (let i = 0; i < countForWeek; i++) {
      const p = parts[i % parts.length];
      const supplier = KNOWN_SUPPLIERS[i % KNOWN_SUPPLIERS.length];
      const project = PROJECTS[(i + w) % PROJECTS.length];
      const missingQty = 2 + ((w * 3 + i * 5) % 35);
      
      records.push({
        id: `rec-msp-${w}-${i}`,
        fileId,
        week: w,
        year: 2026,
        periodLabel: `Semaine ${w} / 2026`,
        reference: p.ref,
        designation: p.des,
        supplier,
        missingQuantity: missingQty,
        criticality: p.crit as any,
        project,
        impactOrder: `OF-2026-${1000 + w * 10 + i}`,
        rootCause: p.cause,
        promiseDate: `2026-09-${(10 + (i % 15)).toString().padStart(2, '0')}`,
        detectedDate: `2026-08-${(w % 28 + 1).toString().padStart(2, '0')}`
      });
    }
  }

  return { files, records };
}

/**
 * Generate initial 24 MDP weekly files and records
 */
export function generateInitialMdp(): { files: PublicFileMetadata[]; records: MDPRecord[] } {
  const files: PublicFileMetadata[] = [];
  const records: MDPRecord[] = [];

  const references = [
    { ref: 'REF-PUMP-601', des: 'Pompe haute pression kérosène' },
    { ref: 'REF-CPU-990', des: 'Calculateur FADEC redondant' },
    { ref: 'REF-TITAN-12', des: 'Forgé titane structural empennage' },
    { ref: 'REF-VALV-881', des: 'Servo-valve de dérive' },
    { ref: 'REF-HARN-442', des: 'Harnais électrique réacteur' },
    { ref: 'REF-SEAT-210', des: 'Structure siège business modulaire' },
    { ref: 'REF-OPT-505', des: 'Capteur optronique tête de mât' },
    { ref: 'REF-SEAL-091', des: 'Joint d\'étanchéité cryogénique' }
  ];

  for (let w = 12; w <= 35; w++) {
    const fileId = `mdp-w${w}-2026`;
    const weekStr = w < 10 ? `0${w}` : `${w}`;
    const fileName = `MDP_Semaine_${weekStr}_2026.xlsx`;
    const dateStr = `2026-${Math.floor((w - 1) / 4) + 3 > 9 ? Math.floor((w - 1) / 4) + 3 : '0' + (Math.floor((w - 1) / 4) + 3)}-15T09:00:00.000Z`;
    const rowCount = 62 + ((w * 11) % 25);

    files.push({
      id: fileId,
      name: fileName,
      folderKey: 'mdp',
      url: `https://storage.enterprise-cloud.net/public/supply-chain/02_MDP/${fileName}`,
      sizeBytes: 210000 + (w * 4200),
      lastModified: dateStr,
      hash: `md5_mdp_w${w}_` + (210000 + w * 4200),
      period: `W${weekStr}-2026`,
      periodType: 'week',
      year: 2026,
      weekOrMonthNumber: w,
      processed: true,
      processedAt: '2026-09-06T15:00:00.000Z',
      rowCount,
      status: 'synced'
    });

    const countForWeek = Math.min(rowCount, 8);
    for (let i = 0; i < countForWeek; i++) {
      const r = references[i % references.length];
      const supplier = KNOWN_SUPPLIERS[(i + 2) % KNOWN_SUPPLIERS.length];
      const project = PROJECTS[(i + 1) % PROJECTS.length];
      const isConfirmed = (i + w) % 5 !== 0; // ~80% confirmed

      // Test condition for Message 20 (Explicit user rule: date confirmée et pas de need date)
      const isMessage20Candidate = isConfirmed && ((i === 5 && w % 2 === 0) || (i === 2 && w % 4 === 1));

      let needDateStr: string | undefined = `2026-09-${(12 + (i % 8)).toString().padStart(2, '0')}`;
      if (isMessage20Candidate) {
        needDateStr = undefined; // PAS DE NEED DATE !
      }

      let delta = 0;
      if (isConfirmed) {
        if (isMessage20Candidate) {
          delta = 0;
        } else if (i % 3 === 0) {
          delta = 6 + (w % 8); // Late -> Message 10 (Avancement)
        } else if (i % 3 === 1) {
          delta = -(4 + (w % 6)); // Early -> Message 15 (Report)
        } else {
          delta = 0; // Aligné
        }
      } else {
        delta = 14;
      }

      let confirmedDateStr: string | undefined = undefined;
      if (isConfirmed) {
        if (isMessage20Candidate) {
          confirmedDateStr = `2026-09-${(15 + (i * 2)).toString().padStart(2, '0')}`;
        } else {
          const baseDay = 12 + (i % 8) + delta;
          const clampedDay = Math.max(1, Math.min(30, baseDay));
          confirmedDateStr = `2026-09-${clampedDay.toString().padStart(2, '0')}`;
        }
      }

      let evolution: 'Avance' | 'Report' | 'Stable' | 'Nouveau besoin' = 'Stable';
      if (!isConfirmed) evolution = 'Report';
      else if (delta > 2) evolution = 'Avance';
      else if (delta < -2) evolution = 'Report';
      else if (i === 0 && w % 3 === 0) evolution = 'Nouveau besoin';

      let scheduleStatus: 'À l\'heure' | 'En retard' | 'En avance' | 'Non confirmé' = 'À l\'heure';
      if (!isConfirmed) scheduleStatus = 'Non confirmé';
      else if (delta > 0) scheduleStatus = 'En retard';
      else if (delta < 0) scheduleStatus = 'En avance';

      const unitCost = 450 + (i * 380) + (w * 40);
      const quantity = 10 + ((w * 4 + i * 8) % 80);

      const mrpEval = evaluateMrpException({
        confirmedDate: confirmedDateStr,
        needDate: needDateStr,
        deltaDays: delta,
        status: isConfirmed ? 'Confirmé' : 'Non confirmé',
        evolution
      });

      records.push({
        id: `rec-mdp-${w}-${i}`,
        fileId,
        week: w,
        year: 2026,
        periodLabel: `Semaine ${w} / 2026`,
        reference: r.ref,
        designation: r.des,
        supplier,
        status: isConfirmed ? 'Confirmé' : 'Non confirmé',
        confirmedDate: confirmedDateStr,
        needDate: needDateStr,
        poNumber: `PO-45000${w}${i}`,
        contractNumber: `CTR-RAIL-${2025 + (i % 2)}-${w * 5 + i}`,
        quantity,
        unitCost,
        totalAmount: quantity * unitCost,
        project,
        deltaDays: delta,
        scheduleStatus,
        evolution,
        exceptionCode: mrpEval.exceptionCode,
        exceptionLabel: mrpEval.exceptionLabel,
        exceptionAction: mrpEval.exceptionAction,
        exceptionSeverity: mrpEval.exceptionSeverity
      });
    }
  }

  return { files, records };
}

/**
 * Generate initial 20 PF weekly files and records
 */
export function generateInitialPf(): { files: PublicFileMetadata[]; records: PFRecord[] } {
  const files: PublicFileMetadata[] = [];
  const records: PFRecord[] = [];

  const pfItems = [
    { ref: 'PF-COR-BOGIE-01', des: 'Bogie moteur complet Coradia Liner', proj: 'Alstom Coradia Polyvalent', client: 'SNCF Voyageurs' },
    { ref: 'PF-CIT-ROOF-TRA', des: 'Coffre de traction toiture Citadis', proj: 'Alstom Citadis Dualis', client: 'Île-de-France Mobilités' },
    { ref: 'PF-AVE-CAB-TGV', des: 'Cabine de conduite Avelia Horizon TGV M', proj: 'Alstom Avelia Horizon TGV M', client: 'SNCF Voyageurs TGV' },
    { ref: 'PF-MET-DOOR-AUTO', des: 'Système portes palières & accès Metropolis', proj: 'Alstom Metropolis Metro', client: 'RATP / Métro Grand Paris' },
    { ref: 'PF-TRX-TRANSFO-3', des: 'Transformateur principal 25kV Traxx MS3', proj: 'Alstom Traxx MS3 Locomotive', client: 'Deutsche Bahn DB Cargo' },
    { ref: 'PF-AVE-PANTO-25K', des: 'Module pantographe bistandard 25kV', proj: 'Alstom Avelia Horizon TGV M', client: 'SNCF Voyageurs' }
  ];

  for (let w = 16; w <= 35; w++) {
    const fileId = `pf-w${w}-2026`;
    const weekStr = w < 10 ? `0${w}` : `${w}`;
    const fileName = `PF_Semaine_${weekStr}_2026.xlsx`;
    const dateStr = `2026-${Math.floor((w - 1) / 4) + 3 > 9 ? Math.floor((w - 1) / 4) + 3 : '0' + (Math.floor((w - 1) / 4) + 3)}-15T10:00:00.000Z`;
    const rowCount = 38 + ((w * 5) % 15);

    files.push({
      id: fileId,
      name: fileName,
      folderKey: 'pf',
      url: `https://storage.enterprise-cloud.net/public/supply-chain/03_PRODUITS_FINIS/${fileName}`,
      sizeBytes: 118000 + (w * 2400),
      lastModified: dateStr,
      hash: `md5_pf_w${w}_` + (118000 + w * 2400),
      period: `W${weekStr}-2026`,
      periodType: 'week',
      year: 2026,
      weekOrMonthNumber: w,
      processed: true,
      processedAt: '2026-09-06T15:00:00.000Z',
      rowCount,
      status: 'synced'
    });

    const countForWeek = Math.min(rowCount, 6);
    for (let i = 0; i < countForWeek; i++) {
      const item = pfItems[i % pfItems.length];
      const targetQty = 2 + (i % 4);
      
      let statusOF: 'Planifié' | 'En cours' | 'Livré' | 'En retard' | 'Bloqué' = 'En cours';
      if (w < 32) {
        statusOF = (i % 5 === 0) ? 'En retard' : 'Livré';
      } else if (w < 35) {
        statusOF = (i % 3 === 0) ? 'En retard' : (i % 2 === 0 ? 'Livré' : 'En cours');
      } else {
        statusOF = (i === 1) ? 'Bloqué' : (i % 2 === 0 ? 'En cours' : 'Planifié');
      }

      const deliveredQty = statusOF === 'Livré' ? targetQty : (statusOF === 'En retard' ? Math.max(0, targetQty - 1) : 0);

      records.push({
        id: `rec-pf-${w}-${i}`,
        fileId,
        week: w,
        year: 2026,
        periodLabel: `Semaine ${w} / 2026`,
        pfReference: item.ref,
        designation: item.des,
        project: item.proj,
        deliveryDate: `2026-${(Math.min(12, Math.floor(w / 3.2))).toString().padStart(2, '0')}-${((i * 4 + 5) % 25 + 1).toString().padStart(2, '0')}`,
        statusOF,
        quantity: targetQty,
        deliveredQuantity: deliveredQty,
        customer: item.client,
        riskFactor: statusOF === 'Bloqué' || statusOF === 'En retard' ? 'Élevé' : (statusOF === 'En cours' ? 'Moyen' : 'Faible')
      });
    }
  }

  return { files, records };
}

/**
 * Generate initial 12 OTIF monthly files and records (January to December 2026)
 */
export function generateInitialOtif(): { files: PublicFileMetadata[]; records: OTIFRecord[] } {
  const files: PublicFileMetadata[] = [];
  const records: OTIFRecord[] = [];

  const categories: ('Mécanique' | 'Électronique' | 'Fonderie' | 'Usinage' | 'Câblage')[] = [
    'Mécanique', 'Électronique', 'Mécanique', 'Usinage', 'Câblage', 'Fonderie', 'Mécanique', 'Câblage', 'Usinage', 'Électronique'
  ];

  // Months 1 to 12 in 2026
  for (let m = 1; m <= 12; m++) {
    const monthName = MONTH_NAMES_FR[m - 1];
    const monthNumStr = m < 10 ? `0${m}` : `${m}`;
    const fileName = `OTIF_${monthName}_2026.xlsx`;
    const fileId = `otif-m${m}-2026`;
    const dateStr = `2026-${monthNumStr}-28T18:00:00.000Z`;
    const isFutureMonth = m > 9; // September is current month (m=9)
    const rowCount = 28 + (m % 10);

    files.push({
      id: fileId,
      name: fileName,
      folderKey: 'otif',
      url: `https://storage.enterprise-cloud.net/public/supply-chain/04_OTIF/${fileName}`,
      sizeBytes: 85000 + (m * 1800),
      lastModified: dateStr,
      hash: `md5_otif_m${m}_` + (85000 + m * 1800),
      period: `${monthNumStr}-2026`,
      periodType: 'month',
      year: 2026,
      weekOrMonthNumber: m,
      processed: true,
      processedAt: '2026-09-06T15:00:00.000Z',
      rowCount,
      status: 'synced'
    });

    for (let s = 0; s < KNOWN_SUPPLIERS.length; s++) {
      const supplier = KNOWN_SUPPLIERS[s];
      const baseRate = 92 + ((s * 3 + m * 2) % 7);
      // Introduce realistic fluctuations: some suppliers dip to 84-88% in summer
      const fluctuation = (m >= 6 && m <= 8 && s % 3 === 0) ? -8 : 0;
      const otifRate = Math.min(99.4, Math.max(78.5, baseRate + fluctuation - (s % 2 === 0 ? 3 : -1)));
      const totalLines = 40 + ((s * 15 + m * 8) % 65);
      const onTimeLines = Math.round(totalLines * (otifRate / 100));

      records.push({
        id: `rec-otif-${m}-${s}`,
        fileId,
        month: m,
        year: 2026,
        monthLabel: `${monthName} 2026`,
        supplier,
        otifRate: Number(otifRate.toFixed(1)),
        totalLines,
        onTimeLines,
        targetRate: 95.0,
        category: categories[s % categories.length]
      });
    }
  }

  return { files, records };
}

/**
 * Initial Data Quality Report matching prompt specs:
 * Fichiers analysés: 80, Lignes: 125,430, Erreurs: 12, Doublons: 45...
 */
export function getInitialQualityReport(filesCount: number, linesCount: number): DataQualityReport {
  return {
    timestamp: '2026-09-06T15:00:00.000Z',
    filesAnalyzed: filesCount || 80,
    linesAnalyzed: linesCount || 125430,
    errors: 12,
    duplicates: 45,
    missingColumns: 0,
    invalidDates: 3,
    unknownSuppliers: 2,
    qualityScore: 98.4,
    issues: [
      {
        id: 'iss-1',
        folderKey: 'msp',
        fileName: 'MSP_Semaine_28_2026.xlsx',
        rowNumber: 142,
        issueType: 'duplicate_row',
        description: 'Doublon détecté sur la référence REF-VALV-1204 pour le même OF-2026-1280. Ligne dédupliquée automatiquement.',
        severity: 'low'
      },
      {
        id: 'iss-2',
        folderKey: 'mdp',
        fileName: 'MDP_Semaine_31_2026.xlsx',
        rowNumber: 88,
        issueType: 'invalid_date',
        description: 'Format de date de besoin non standard ("31/09/2026" - jour inexistant). Normalisé vers 30/09/2026.',
        severity: 'medium'
      },
      {
        id: 'iss-3',
        folderKey: 'mdp',
        fileName: 'MDP_Semaine_33_2026.xlsx',
        rowNumber: 219,
        issueType: 'unknown_supplier',
        description: 'Fournisseur typographié "KNORR BREMSE RAIL" normalisé en "Knorr-Bremse Rail Systems".',
        severity: 'low'
      },
      {
        id: 'iss-4',
        folderKey: 'pf',
        fileName: 'PF_Semaine_30_2026.xlsx',
        rowNumber: 45,
        issueType: 'format_error',
        description: 'Quantité livrée renseignée en texte ("2 EA"). Extrait numérique converti en 2.',
        severity: 'low'
      },
      {
        id: 'iss-5',
        folderKey: 'otif',
        fileName: 'OTIF_Juillet_2026.xlsx',
        rowNumber: 12,
        issueType: 'invalid_date',
        description: 'Période déduite par métadonnées du fichier (nom de fichier sans accent).',
        severity: 'low'
      }
    ]
  };
}

/**
 * Generates rich railway stock records with Material Planners, Suppliers, and Projects
 */
export function generateInitialStock(): StockRecord[] {
  const stockItems: StockRecord[] = [];
  
  const partTemplates = [
    { ref: 'REF-VALV-1204', desc: 'Electrovanne de freinage d\'urgence', cost: 1250, plannerIdx: 0, supplierIdx: 0, projIdx: 0, baseQty: 120, safety: 40, max: 150, daily: 3.5, location: 'Magasin A-04' },
    { ref: 'REF-DISC-3301', desc: 'Disque de frein ventilé acier TGV', cost: 2400, plannerIdx: 2, supplierIdx: 0, projIdx: 2, baseQty: 85, safety: 30, max: 100, daily: 2.1, location: 'Zone B-12' },
    { ref: 'REF-PANT-8820', desc: 'Archet de pantographe carbone 25kV', cost: 3800, plannerIdx: 1, supplierIdx: 1, projIdx: 0, baseQty: 42, safety: 15, max: 50, daily: 0.9, location: 'Magasin A-08' },
    { ref: 'REF-DOOR-5541', desc: 'Actionneur pneumatique porte passager', cost: 1850, plannerIdx: 1, supplierIdx: 1, projIdx: 1, baseQty: 95, safety: 35, max: 120, daily: 2.8, location: 'Zone C-01' },
    { ref: 'REF-INVT-9902', desc: 'Module onduleur de traction IGBT 3.3kV', cost: 14500, plannerIdx: 3, supplierIdx: 2, projIdx: 2, baseQty: 18, safety: 8, max: 25, daily: 0.4, location: 'Salle Blanche E-02' },
    { ref: 'REF-MOTR-4410', desc: 'Moteur asynchrone fermé bogie 450kW', cost: 22000, plannerIdx: 3, supplierIdx: 2, projIdx: 3, baseQty: 12, safety: 6, max: 16, daily: 0.25, location: 'Zone Lourde H-01' },
    { ref: 'REF-BEAR-7730', desc: 'Boîte d\'essieu & roulement à rouleaux coniques', cost: 890, plannerIdx: 2, supplierIdx: 3, projIdx: 0, baseQty: 340, safety: 100, max: 400, daily: 8.5, location: 'Magasin B-03' },
    { ref: 'REF-AXLE-6621', desc: 'Essieu monté ferroviaire forgé 22.5t', cost: 6200, plannerIdx: 2, supplierIdx: 8, projIdx: 4, baseQty: 24, safety: 12, max: 35, daily: 0.6, location: 'Zone Extérieure Bogie' },
    { ref: 'REF-CBKR-3105', desc: 'Disjoncteur ultra-rapide continu DC 1500V', cost: 7800, plannerIdx: 3, supplierIdx: 4, projIdx: 1, baseQty: 16, safety: 8, max: 22, daily: 0.35, location: 'Salle Blanche E-04' },
    { ref: 'REF-TRAN-5520', desc: 'Transformateur principal monophasé 25kV', cost: 38000, plannerIdx: 3, supplierIdx: 4, projIdx: 2, baseQty: 6, safety: 3, max: 8, daily: 0.1, location: 'Zone Lourde H-03' },
    { ref: 'REF-COUPL-911', desc: 'Attelage automatique Scharfenberg Type 10', cost: 16500, plannerIdx: 0, supplierIdx: 5, projIdx: 3, baseQty: 14, safety: 6, max: 20, daily: 0.3, location: 'Zone H-05' },
    { ref: 'REF-GEAR-4200', desc: 'Réducteur de vitesse à engrenages hélicoïdaux', cost: 11200, plannerIdx: 2, supplierIdx: 5, projIdx: 4, baseQty: 20, safety: 8, max: 28, daily: 0.45, location: 'Magasin C-07' },
    { ref: 'REF-SEAT-1002', desc: 'Fauteuil passager 1ère classe cuir inclinable', cost: 920, plannerIdx: 4, supplierIdx: 6, projIdx: 2, baseQty: 220, safety: 60, max: 300, daily: 6.0, location: 'Magasin D-01' },
    { ref: 'REF-SEAT-2005', desc: 'Banquette modulaire 2nde classe antivandalisme', cost: 640, plannerIdx: 4, supplierIdx: 6, projIdx: 1, baseQty: 410, safety: 120, max: 500, daily: 11.5, location: 'Magasin D-02' },
    { ref: 'REF-RELAY-110', desc: 'Relais de sécurité ferroviaire SIL4', cost: 420, plannerIdx: 3, supplierIdx: 7, projIdx: 3, baseQty: 580, safety: 150, max: 700, daily: 14.0, location: 'Magasin Élec A-01' },
    { ref: 'REF-SWTCH-890', desc: 'Manipulateur de traction pupitre de conduite', cost: 3100, plannerIdx: 1, supplierIdx: 7, projIdx: 4, baseIdx: 28, safety: 10, max: 35, daily: 0.7, location: 'Salle Blanche E-01' },
    { ref: 'REF-WHEEL-501', desc: 'Roue monobloc acier traité thermique R8T', cost: 1650, plannerIdx: 2, supplierIdx: 8, projIdx: 0, baseQty: 160, safety: 50, max: 220, daily: 3.8, location: 'Zone Parc Roues' },
    { ref: 'REF-HVAC-9002', desc: 'Centrale de climatisation toiture réversible 45kW', cost: 26500, plannerIdx: 4, supplierIdx: 9, projIdx: 0, baseQty: 10, safety: 4, max: 14, daily: 0.2, location: 'Zone Lourde H-02' },
    { ref: 'REF-TCMS-1040', desc: 'Calculateur centralisé réseau train (TCMS)', cost: 18900, plannerIdx: 1, supplierIdx: 9, projIdx: 2, baseQty: 15, safety: 6, max: 20, daily: 0.3, location: 'Salle Blanche E-03' },
    { ref: 'REF-SENS-3022', desc: 'Capteur de vitesse & température bogie', cost: 340, plannerIdx: 0, supplierIdx: 3, projIdx: 3, baseQty: 480, safety: 120, max: 600, daily: 12.0, location: 'Magasin Élec A-03' },
    { ref: 'REF-LIGHT-770', desc: 'Projecteur frontal LED bi-mode longue portée', cost: 1450, plannerIdx: 4, supplierIdx: 7, projIdx: 4, baseQty: 65, safety: 20, max: 80, daily: 1.5, location: 'Magasin C-02' },
    { ref: 'REF-SUSP-4401', desc: 'Ressort hélicoïdal suspension primaire acier', cost: 780, plannerIdx: 2, supplierIdx: 8, projIdx: 0, baseQty: 190, safety: 60, max: 240, daily: 4.2, location: 'Magasin B-05' },
    { ref: 'REF-COMP-6610', desc: 'Compresseur d\'air principal à vis sans huile', cost: 19500, plannerIdx: 0, supplierIdx: 0, projIdx: 1, baseQty: 8, safety: 4, max: 12, daily: 0.18, location: 'Zone H-04' },
    { ref: 'REF-PUMP-2204', desc: 'Pompe de refroidissement transformateur', cost: 4600, plannerIdx: 3, supplierIdx: 2, projIdx: 2, baseQty: 22, safety: 8, max: 30, daily: 0.5, location: 'Magasin C-04' },
    { ref: 'REF-BATT-8800', desc: 'Coffre batterie secours Ni-Cd 110V 240Ah', cost: 12400, plannerIdx: 1, supplierIdx: 4, projIdx: 0, baseQty: 14, safety: 5, max: 18, daily: 0.28, location: 'Zone B-08' }
  ];

  partTemplates.forEach((t, index) => {
    const planner = MATERIAL_PLANNERS[t.plannerIdx % MATERIAL_PLANNERS.length].name;
    const supplier = KNOWN_SUPPLIERS[t.supplierIdx % KNOWN_SUPPLIERS.length];
    const project = PROJECTS[t.projIdx % PROJECTS.length];

    // Variations in stock status
    let onHand = t.baseQty;
    let reserved = Math.floor(onHand * 0.25);
    let dormantQty = 0;

    // Introduce specific status cases for rich analytical dashboard
    if (index % 6 === 1) {
      // Surstock
      onHand = Math.round(t.max * 1.6);
      dormantQty = Math.round(onHand * 0.35);
    } else if (index % 6 === 3) {
      // Alerte Mini
      onHand = Math.round(t.safety * 0.75);
      reserved = Math.round(onHand * 0.4);
    } else if (index % 12 === 5) {
      // Rupture Imminente
      onHand = Math.round(t.safety * 0.2);
      reserved = onHand;
    }

    const available = Math.max(0, onHand - reserved);
    const stockVal = onHand * t.cost;
    const dormantVal = dormantQty * t.cost;
    const coverage = t.daily > 0 ? Math.round(available / t.daily) : 45;

    let status: 'Surstock' | 'Optimal' | 'Alerte Mini' | 'Rupture Imminente' = 'Optimal';
    if (available <= 0 || coverage < 7) {
      status = 'Rupture Imminente';
    } else if (onHand < t.safety || coverage < 15) {
      status = 'Alerte Mini';
    } else if (onHand > t.max || coverage > 75) {
      status = 'Surstock';
    }

    const dateOffsetDays = index * 3 + 2;
    const movDate = new Date(2026, 7, 28 - (dateOffsetDays % 25)).toISOString().split('T')[0];

    stockItems.push({
      id: `STK-${1000 + index}`,
      reference: t.ref,
      designation: t.desc,
      materialPlanner: planner,
      supplier: supplier,
      project: project,
      unitCost: t.cost,
      onHandQuantity: onHand,
      reservedQuantity: reserved,
      availableQuantity: available,
      safetyStock: t.safety,
      maxStock: t.max,
      stockValue: stockVal,
      dailyConsumptionRate: t.daily,
      coverageDays: coverage,
      dormantStockQty: dormantQty,
      dormantStockValue: dormantVal,
      stockStatus: status,
      lastMovementDate: movDate,
      storageLocation: t.location
    });
  });

  return stockItems;
}
