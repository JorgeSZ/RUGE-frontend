export interface Server {
  id: string;
  eventId: string;
  firstName: string;
  firstLastName: string;
  secondLastName?: string;
  cedula?: string;
  birthDate?: string;
  age?: number;
  email?: string;
  phone?: string;
  church?: string;
  maritalStatus?: string;
  country?: string;
  commissionId?: string;
  commissionName?: string;
  tribeId?: string;
  tribeName?: string;
  hasDiscipleship: boolean;
  hasDiscipleshipPatch: boolean;
  hasGroup: boolean;
  comprobantePagoPath?: string;
  qrCode?: string;
  checkInCompleted: boolean;
  checkInDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateServerRequest {
  eventId: string;
  firstName: string;
  firstLastName: string;
  secondLastName?: string;
  cedula?: string;
  birthDate?: string;
  email?: string;
  phone?: string;
  church?: string;
  maritalStatus?: string;
  country?: string;
  commissionId?: string;
  tribeId?: string;
  hasDiscipleship?: boolean;
  hasGroup?: boolean;
  comprobantePagoPath?: string;
}

export interface UpdateServerRequest {
  firstName: string;
  firstLastName: string;
  secondLastName?: string;
  cedula?: string;
  birthDate?: string;
  email?: string;
  phone?: string;
  church?: string;
  maritalStatus?: string;
  country?: string;
  commissionId?: string;
  tribeId?: string;
  hasDiscipleship?: boolean;
  hasGroup?: boolean;
  comprobantePagoPath?: string;
}
