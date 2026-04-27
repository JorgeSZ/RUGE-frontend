export interface Participant {
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
  shirtSize?: string;
  maritalStatus?: string;
  country?: string;
  tribeId?: string;
  tribeName?: string;
  comprobantePagoPath?: string;
  qrCode?: string;
  checkInCompleted: boolean;
  checkInDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateParticipantRequest {
  eventId: string;
  firstName: string;
  firstLastName: string;
  secondLastName?: string;
  cedula?: string;
  birthDate?: string;
  email?: string;
  phone?: string;
  church?: string;
  shirtSize?: string;
  maritalStatus?: string;
  country?: string;
  tribeId?: string;
  comprobantePagoPath?: string;
}

export interface UpdateParticipantRequest {
  firstName: string;
  firstLastName: string;
  secondLastName?: string;
  cedula?: string;
  birthDate?: string;
  email?: string;
  phone?: string;
  church?: string;
  shirtSize?: string;
  maritalStatus?: string;
  country?: string;
  tribeId?: string;
  comprobantePagoPath?: string;
}
