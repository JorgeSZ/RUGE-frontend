export interface MenuIngrediente {
  id: string;
  menuId: string;
  nombre: string;
  cantidadPorPersona: number;
  unidad: string;
  modoPersonas: 'Auto' | 'Manual' | 'Fixed';
  cantidadPersonasManual?: number;
  orden: number;
}

export interface Menu {
  id: string;
  nombre: string;
  descripcion?: string;
  orden: number;
  createdAt: string;
  ingredientes: MenuIngrediente[];
}

export interface CenaDelReyReport {
  totalPersonasEvento: number;
  menus: MenuReport[];
  listaConsolidada: IngredienteConsolidado[];
}

export interface MenuReport {
  nombre: string;
  descripcion?: string;
  ingredientes: IngredienteReport[];
}

export interface IngredienteReport {
  nombre: string;
  cantidadPorPersona: number;
  unidad: string;
  personas: number;
  total: number;
}

export interface IngredienteConsolidado {
  nombre: string;
  unidad: string;
  totalNecesario: number;
  detallePorMenu: DetallePorMenu[];
}

export interface DetallePorMenu {
  menu: string;
  subtotal: number;
}
