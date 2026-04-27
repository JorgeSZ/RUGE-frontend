export interface LogisticItemDto {
  id: string;
  nombre: string;
  descripcion?: string;
  tipo: string;
  cantidad: number;
  unidad?: string;
  responsable?: string;
  esObligatorio: boolean;
  orden: number;
  completado: boolean;
  completadoEn?: string;
  completadoPor?: string;
  notas?: string;
}

export interface LogisticGroupDto {
  tipo: string;
  total: number;
  completados: number;
  items: LogisticItemDto[];
}

export interface LogisticSegmentDetailResponse {
  segmentId: string;
  segmentName: string;
  total: number;
  completados: number;
  groups: LogisticGroupDto[];
}

export interface LogisticOverviewSegment {
  segmentId: string;
  segmentName: string;
  dia?: string;
  order: number;
  total: number;
  completados: number;
  porcentaje: number;
}

export interface LogisticOverviewResponse {
  segments: LogisticOverviewSegment[];
}

export interface CreateLogisticItemRequest {
  nombre: string;
  descripcion?: string;
  tipo: string;
  cantidad: number;
  unidad?: string;
  responsable?: string;
  esObligatorio: boolean;
  orden?: number;
}

export interface UpdateLogisticItemRequest {
  nombre: string;
  descripcion?: string;
  tipo: string;
  cantidad: number;
  unidad?: string;
  responsable?: string;
  esObligatorio: boolean;
}

export interface UpdateLogisticStatusRequest {
  completado: boolean;
  completadoPor?: string;
  notas?: string;
}

export const LOGISTIC_TIPOS = ['Material', 'Implemento', 'Herramienta', 'Tarea'] as const;
