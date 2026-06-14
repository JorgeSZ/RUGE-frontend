export interface Medication {
  id: string;
  nombreMedicamento: string;
  dosis?: string;
  horario?: string;
  horarios?: string[];
  notas?: string;
  creadoEn: string;
}

export interface CreateMedicationRequest {
  nombreMedicamento: string;
  dosis?: string;
  horario?: string;
  horarios?: string[];
  notas?: string;
}

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
  nombrePreferido?: string;
  asistesIglesia: boolean;
  perteneceGrupo: boolean;
  nombreLiderGrupo?: string;
  telefonoLiderGrupo?: string;
  medications?: Medication[];
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
  nombrePreferido?: string;
  asistesIglesia?: boolean;
  perteneceGrupo?: boolean;
  nombreLiderGrupo?: string;
  telefonoLiderGrupo?: string;
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
  nombrePreferido?: string;
  asistesIglesia?: boolean;
  perteneceGrupo?: boolean;
  nombreLiderGrupo?: string;
  telefonoLiderGrupo?: string;
}

export interface CalaqueroEntry {
  participantId: string;
  nombreCompleto: string;
  nombrePreferido?: string;
  edad?: number;
  tribu?: string;
  medicamentos: { nombre: string; dosis?: string; horario?: string; horarios?: string[]; notas?: string }[];
}
