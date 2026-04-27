export interface EvTaskDto {
  id: string;
  nombre: string;
  descripcion?: string;
  responsable?: string;
  esObligatorio: boolean;
  orden: number;
  completado: boolean;
  completadoEn?: string;
  completadoPor?: string;
  notas?: string;
}

export interface EvTaskSegmentDetailResponse {
  segmentId: string;
  segmentName: string;
  total: number;
  completadas: number;
  pendientes: number;
  pendientesObligatorias: number;
  porcentaje: number;
  tasks: EvTaskDto[];
}

export interface EvTaskOverviewSegment {
  segmentId: string;
  segmentName: string;
  trackNombre: string;
  total: number;
  completadas: number;
  porcentaje: number;
  tareasObligatoriasPendientes: number;
}

export interface EvTaskOverviewResponse {
  segments: EvTaskOverviewSegment[];
}
