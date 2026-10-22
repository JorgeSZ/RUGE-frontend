export interface InventoryItem {
  id: string;
  prioridad: string;
  articulo: string;
  categoria: string;
  cantidad: number;
  estado: string;
  bodegaEn: string | null;
  localizador: string | null;
  fechaIngresoAInventario: string | null;
  notas: string | null;
  cantidadEnEventos: number;
  cantidadDisponible: number;
  usosEnEventos: InventoryEventUsage[];
  createdAt: string;
}

export interface InventoryEventUsage {
  eventId: string;
  eventName: string;
  cantidad: number;
}

export interface EventInventoryOption {
  id: string;
  articulo: string;
  categoria: string;
  cantidadDisponible: number;
}

export type InventoryItemInput = Omit<InventoryItem,
  'id' | 'createdAt' | 'cantidadEnEventos' | 'cantidadDisponible' | 'usosEnEventos'>;

export interface EventInventoryItem {
  id: string;
  eventId: string;
  eventName: string;
  inventoryItemId: string;
  articulo: string;
  categoria: string;
  cantidad: number;
  fechaSalida: string;
  fechaDeUso: string | null;
  quienRetira: string;
  personaResponsable: string | null;
  fechaDevolucion: string | null;
  notas: string | null;
  createdAt: string;
}

export interface EventInventoryItemInput {
  inventoryItemId: string;
  cantidad: number;
  fechaSalida: string;
  fechaDeUso: string | null;
  quienRetira: string;
  personaResponsable: string | null;
  notas: string | null;
}
