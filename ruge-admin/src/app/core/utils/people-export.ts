import { Participant } from '../models/participant.model';
import { Server } from '../models/server.model';
import { environment } from '../../../environments/environment';
import { downloadExcelCsv, exportFileSlug } from './excel-export';
import { comparePersonNames } from './person-sort';

type ExportEvent = { id: string; name?: string };

function paymentUrl(path?: string): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${environment.apiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '')}/${path.replace(/^\/+/, '')}`;
}

function agreementUrl(eventId: string, qrCode?: string): string {
  return qrCode ? `${environment.r2PublicUrl.replace(/\/$/, '')}/pdfs/${eventId}/${qrCode}.pdf` : '';
}

function ageFromBirthDate(value?: string): number | undefined {
  if (!value) return undefined;
  const born = new Date(value), today = new Date();
  if (Number.isNaN(born.getTime()) || born > today) return undefined;
  let years = today.getFullYear() - born.getUTCFullYear();
  if (today.getMonth() < born.getUTCMonth() ||
    (today.getMonth() === born.getUTCMonth() && today.getDate() < born.getUTCDate())) years--;
  return years;
}

export function exportParticipantsExcel(participants: readonly Participant[], event: ExportEvent): void {
  const headers = [
    'ID', 'ID evento', 'Nombre', 'Primer apellido', 'Segundo apellido', 'Nombre preferido',
    'Cédula', 'Fecha de nacimiento', 'Edad', 'Estado civil', 'Nombre esposa', 'Teléfono esposa',
    'Consentimiento de datos aceptado', 'Fecha de consentimiento', 'Correo', 'Teléfono',
    'Iglesia', 'Asiste a iglesia', 'Pertenece a grupo', 'Nombre del líder', 'Teléfono del líder',
    'Contacto de emergencia', 'Teléfono de emergencia',
    'País', 'Talla de camisa', 'ID tribu', 'Tribu', 'URL comprobante', 'Código QR',
    'URL acuerdo de participación', 'Check-in completado', 'Fecha de check-in',
    'Padecimientos', 'Medicamentos (JSON)', 'Creado', 'Actualizado'
  ];
  const rows = [...participants].sort(comparePersonNames).map(p => [
    p.id, p.eventId || event.id, p.firstName, p.firstLastName, p.secondLastName, p.nombrePreferido,
    p.cedula, p.birthDate, p.age ?? ageFromBirthDate(p.birthDate), p.maritalStatus, p.nombreEsposa, p.telefonoEsposa,
    p.privacyConsentAccepted ? 'Sí' : 'No', p.privacyConsentAt, p.email, p.phone, p.church,
    p.asistesIglesia ? 'Sí' : 'No', p.perteneceGrupo ? 'Sí' : 'No',
    p.nombreLiderGrupo, p.telefonoLiderGrupo, p.emergencyContactName, p.emergencyContactPhone, p.country, p.shirtSize, p.tribeId,
    p.tribeName, paymentUrl(p.comprobantePagoPath), p.qrCode, agreementUrl(p.eventId || event.id, p.qrCode),
    p.checkInCompleted ? 'Sí' : 'No', p.checkInDate,
    p.medicalConditions, p.medications?.length ? JSON.stringify(p.medications) : '', p.createdAt, p.updatedAt
  ]);
  const date = new Date().toISOString().slice(0, 10);
  downloadExcelCsv(`senderistas-${exportFileSlug(event.name)}-${date}.csv`, headers, rows);
}


export function exportServersExcel(servers: readonly Server[], event: ExportEvent): void {
  const headers = [
    'ID', 'ID evento', 'Nombre', 'Primer apellido', 'Segundo apellido', 'Cédula',
    'Fecha de nacimiento', 'Edad', 'Correo', 'Teléfono', 'Iglesia', 'Estado civil',
    'País', 'ID equipo', 'Equipo', 'ID tribu', 'Tribu', 'Tiene discipulado',
    'Tiene parche de discipulado', 'Tiene grupo', 'Está en New Life', 'Módulo',
    'Nombre del líder', 'Teléfono del líder', 'Correo del líder', 'URL comprobante',
    'Código QR', 'URL acuerdo de participación', 'Consentimiento de datos aceptado', 'Fecha de consentimiento',
    'Check-in completado', 'Fecha de check-in',
    'Estado de aprobación', 'Fecha de aprobación', 'Creado', 'Actualizado'
  ];
  const rows = [...servers].sort(comparePersonNames).map(s => [
    s.id, s.eventId || event.id, s.firstName, s.firstLastName, s.secondLastName, s.cedula,
    s.birthDate, s.age ?? ageFromBirthDate(s.birthDate), s.email, s.phone, s.church, s.maritalStatus, s.country,
    s.commissionId, s.commissionName, s.tribeId, s.tribeName,
    s.hasDiscipleship ? 'Sí' : 'No', s.hasDiscipleshipPatch ? 'Sí' : 'No',
    s.hasGroup ? 'Sí' : 'No', s.estaEnNewLife ? 'Sí' : 'No', s.modulo,
    s.nombreLider, s.telefonoLider, s.emailLider, paymentUrl(s.comprobantePagoPath),
    s.qrCode, agreementUrl(s.eventId || event.id, s.qrCode), s.privacyConsentAccepted ? 'Sí' : 'No', s.privacyConsentAt,
    s.checkInCompleted ? 'Sí' : 'No',
    s.checkInDate, s.approvalStatus, s.approvalDate, s.createdAt, s.updatedAt
  ]);
  const date = new Date().toISOString().slice(0, 10);
  downloadExcelCsv(`servidores-${exportFileSlug(event.name)}-${date}.csv`, headers, rows);
}

