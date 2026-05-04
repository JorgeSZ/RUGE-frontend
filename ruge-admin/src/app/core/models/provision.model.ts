export interface ProvisionItem {
  id: string;
  nombre: string;
  cantidadPorPersona: number;
  unidad: string;
  orden: number;
  createdAt: string;
}

export interface ProvisionReport {
  totalPersonas: number;
  totalSenderistas: number;
  totalServidores: number;
  items: ProvisionItemReport[];
}

export interface ProvisionItemReport {
  nombre: string;
  cantidadPorPersona: number;
  unidad: string;
  totalNecesario: number;
}

export const UNIDADES_MEDIDA = ['Unidades', 'Kg', 'Litros'];
