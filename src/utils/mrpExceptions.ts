import { MDPRecord, ExceptionMessageCode, ExceptionMessageInfo } from '../types';

export const EXCEPTION_MESSAGES_INFO: Record<ExceptionMessageCode, ExceptionMessageInfo> = {
  '10': {
    code: '10',
    label: "Demande d'avancement de besoin",
    description: "La date de besoin client est antérieure à la date confirmée par le fournisseur. Risque de rupture d'assemblage.",
    actionRequired: "Contacter le fournisseur pour négocier un avancement de livraison ou mettre en place un transport express.",
    severity: 'critical',
    badgeColor: 'bg-rose-950/80 text-rose-300 border-rose-800'
  },
  '15': {
    code: '15',
    label: "Demande de report de besoin",
    description: "Le besoin en production a été repoussé. La date confirmée est trop précoce par rapport à la date de besoin réelle.",
    actionRequired: "Demander au fournisseur de différer l'expédition à la nouvelle Need Date pour éviter le sur-stockage.",
    severity: 'warning',
    badgeColor: 'bg-amber-950/80 text-amber-300 border-amber-800'
  },
  '20': {
    code: '20',
    label: "Besoin à annuler",
    description: "Commande d'achat confirmée sans aucune Need Date active (besoin supprimé du plan directeur de production).",
    actionRequired: "Annuler immédiatement la commande PO auprès du fournisseur pour libérer les engagements financiers.",
    severity: 'critical',
    badgeColor: 'bg-purple-950/80 text-purple-300 border-purple-800'
  },
  'NONE': {
    code: 'NONE',
    label: "Aucune exception (Aligné)",
    description: "La date confirmée et la date de besoin sont parfaitement synchronisées dans les tolérances.",
    actionRequired: "Aucune action requise — flux régulier sous contrôle.",
    severity: 'info',
    badgeColor: 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
  }
};

/**
 * Deterministically evaluates the exception message for an MDP row based on rules:
 * Rule 1: Date confirmée présente ET Pas de need date => Message 20 (Besoin à annuler)
 * Rule 2: Delta > 0 (Need Date < Date Confirmée ou retard) => Message 10 (Demande d'avancement de besoin)
 * Rule 3: Delta < -2 (Date Confirmée < Need Date par plus de 2 jours) => Message 15 (Demande de report de besoin)
 * Rule 4: Sinon => NONE
 */
export function evaluateMrpException(params: {
  confirmedDate?: string;
  needDate?: string;
  deltaDays: number;
  status: 'Confirmé' | 'Non confirmé';
  evolution?: 'Avance' | 'Report' | 'Stable' | 'Nouveau besoin';
}): {
  exceptionCode: ExceptionMessageCode;
  exceptionLabel: string;
  exceptionAction: string;
  exceptionSeverity: 'critical' | 'warning' | 'info' | 'normal';
} {
  const { confirmedDate, needDate, deltaDays, status, evolution } = params;

  // RULE FOR MESSAGE 20: Explicitly specified by user:
  // "message 20 besoin a annuler se sont les ou on a une date confirmer et pas de need date"
  if (confirmedDate && (!needDate || needDate.trim() === '' || needDate === 'N/A' || needDate === 'Non défini')) {
    const info = EXCEPTION_MESSAGES_INFO['20'];
    return {
      exceptionCode: '20',
      exceptionLabel: info.label,
      exceptionAction: info.actionRequired,
      exceptionSeverity: 'critical'
    };
  }

  // If order is not confirmed, no confirmedDate to advance or cancel yet, standard follow-up
  if (status === 'Non confirmé' && (!confirmedDate || confirmedDate.trim() === '')) {
    // If need date is close and not confirmed, needs expedite / relance
    const info = EXCEPTION_MESSAGES_INFO['10'];
    return {
      exceptionCode: '10',
      exceptionLabel: info.label,
      exceptionAction: "Relancer d'urgence l'accusé de réception fournisseur avec date cible au " + (needDate || 'plus tôt'),
      exceptionSeverity: 'critical'
    };
  }

  // RULE FOR MESSAGE 10: Demande d'avancement de besoin
  // (Need date is sooner than confirmed date, or evolution is Avance, or positive delta)
  if (deltaDays > 1 || evolution === 'Avance') {
    const info = EXCEPTION_MESSAGES_INFO['10'];
    return {
      exceptionCode: '10',
      exceptionLabel: info.label,
      exceptionAction: `Négocier un avancement de ${Math.abs(deltaDays)} jours auprès du fournisseur (Need: ${needDate})`,
      exceptionSeverity: deltaDays > 5 ? 'critical' : 'warning'
    };
  }

  // RULE FOR MESSAGE 15: Demande de report de besoin
  // (Confirmed date arrives earlier than required by > 2 days, or evolution is Report)
  if (deltaDays < -2 || evolution === 'Report') {
    const info = EXCEPTION_MESSAGES_INFO['15'];
    return {
      exceptionCode: '15',
      exceptionLabel: info.label,
      exceptionAction: `Demander le report de livraison de ${Math.abs(deltaDays)} jours (Livraison souhaitée: ${needDate})`,
      exceptionSeverity: 'warning'
    };
  }

  const info = EXCEPTION_MESSAGES_INFO['NONE'];
  return {
    exceptionCode: 'NONE',
    exceptionLabel: info.label,
    exceptionAction: info.actionRequired,
    exceptionSeverity: 'normal'
  };
}
