// ── Legacy models (still used by existing report cards) ────────────────────
export interface ShirtSizeReport { shirtSize: string; count: number; }
export interface ParticipantsByTribeReport { tribeName: string; participants: { id: string; name: string }[]; }
export interface ServersByCommissionReport { commissionName: string; servers: { id: string; name: string }[]; }

// ── New shirt report models ────────────────────────────────────────────────
export interface ShirtListEntry {
  nombre: string;
  primerApellido: string;
  segundoApellido?: string;
  talla: string;
}

export interface ShirtListResponse { total: number; participantes: ShirtListEntry[]; }

export interface ShirtSizeLineItem { shirtSize: string; count: number; percentage: number; }
export interface ShirtSummaryResponse { eventId: string; totalParticipants: number; sizes: ShirtSizeLineItem[]; }

// ── Discipleship patch model ───────────────────────────────────────────────
export interface DiscipleshipPatchEntry {
  nombre: string;
  primerApellido: string;
  segundoApellido?: string;
  comision?: string;
  iglesia?: string;
}

export interface DiscipleshipPatchResponse {
  totalParchesPendientes: number;
  servidores: DiscipleshipPatchEntry[];
}

// ── Gorras (caps) report model ─────────────────────────────────────────────
export interface CapsEntry { nombreGorra: string; nombreCompleto: string; }
export interface CapsReportResponse { totalGorras: number; senderistas: CapsEntry[]; }

// Re-export from provision/menu models for use in reports component
export type { ProvisionReport, ProvisionItemReport } from './provision.model';
export type { CenaDelReyReport, IngredienteConsolidado } from './menu.model';
