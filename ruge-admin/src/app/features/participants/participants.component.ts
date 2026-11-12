import { DialogService } from '../../core/services/dialog.service';
import { inject, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ParticipantService } from '../../core/services/participant.service';
import { TribeService } from '../../core/services/tribe.service';
import { EventContextService } from '../../core/services/event-context.service';
import { EventService } from '../../core/services/event.service';
import { Participant } from '../../core/models/participant.model';
import { Tribe } from '../../core/models/tribe.model';
import { preserveDocumentPaths } from '../../core/utils/document-paths';
import { downloadExcelCsv, exportFileSlug } from '../../core/utils/excel-export';
import { environment } from '../../../environments/environment';
import { comparePersonNames } from '../../core/utils/person-sort';

const SHIRT_SIZES = ['XS','S','M','L','XL','2XL','3XL','4XL','5XL'];
const MARITAL_STATUSES = ['Soltero', 'Casado', 'Divorciado', 'Viudo', 'Unión libre'];

@Component({
  selector: 'app-participants',
  templateUrl: './participants.component.html',
  styleUrls: ['./participants.component.css', '../list-pagination.css'],
  standalone: false
})
export class ParticipantsComponent implements OnInit {
  private readonly dialogs = inject(DialogService);
  participants: Participant[] = [];
  tribes: Tribe[] = [];
  page = 1;
  pageSize = 25;
  filtered: Participant[] = [];
  paged: Participant[] = [];
  get pageCount(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  get firstResult(): number { return this.filtered.length ? (this.page - 1) * this.pageSize + 1 : 0; }
  get lastResult(): number { return Math.min(this.page * this.pageSize, this.filtered.length); }
  setPage(page: number): void { this.page = page; this.applyFilters(false); }
  trackPerson(_index: number, person: Participant): string { return person.id; }
  loading = false;
  showForm = false;
  editingId: string | null = null;
  form: FormGroup;
  shirtSizes = SHIRT_SIZES;
  maritalStatuses = MARITAL_STATUSES;
  filterTribeId = '';
  get asistesIglesia(): boolean { return !!this.form.get('asistesIglesia')?.value; }
  get churchValue(): string { return this.form.get('church')?.value ?? ''; }
  get showImpactFields(): boolean { return this.asistesIglesia && /impact/i.test(this.churchValue); }
  get perteneceGrupo(): boolean { return !!this.form.get('perteneceGrupo')?.value; }
  filterSinTribu = false;
  filterCheckin = '';
  searchTerm = '';
  apiUrl = environment.apiUrl;
  copied = false;
  participantRegistrationEnabled = true;
  updatingRegistrationStatus = false;

  // Drawer
  drawerOpen = false;
  drawerParticipant: import('../../core/models/participant.model').Participant | null = null;
  resendingAgreementId: string | null = null;

  readonly years = Array.from({length: new Date().getFullYear() - 1929}, (_, i) => String(new Date().getFullYear() - i));
  readonly months = [
    {v:'01',l:'Enero'},{v:'02',l:'Febrero'},{v:'03',l:'Marzo'},{v:'04',l:'Abril'},
    {v:'05',l:'Mayo'},{v:'06',l:'Junio'},{v:'07',l:'Julio'},{v:'08',l:'Agosto'},
    {v:'09',l:'Septiembre'},{v:'10',l:'Octubre'},{v:'11',l:'Noviembre'},{v:'12',l:'Diciembre'},
  ];
  bdYear = ''; bdMonth = ''; bdDay = '';

  get bdDays(): string[] {
    if (!this.bdYear || !this.bdMonth) return Array.from({length: 31}, (_, i) => String(i + 1));
    return Array.from({length: new Date(+this.bdYear, +this.bdMonth, 0).getDate()}, (_, i) => String(i + 1));
  }

  onBdChange(): void {
    if (this.bdYear && this.bdMonth && this.bdDay) {
      if (+this.bdDay > this.bdDays.length) this.bdDay = '';
    }
    const v = (this.bdYear && this.bdMonth && this.bdDay)
      ? `${this.bdYear}-${this.bdMonth}-${this.bdDay.padStart(2,'0')}`
      : '';
    this.form.patchValue({birthDate: v});
  }

  constructor(
    private fb: FormBuilder,
    private participantService: ParticipantService,
    private tribeService: TribeService,
    private eventService: EventService,
    public eventCtx: EventContextService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      firstName:          ['', [Validators.required, Validators.minLength(2)]],
      firstLastName:      ['', [Validators.required, Validators.minLength(2)]],
      secondLastName:     [''],
      cedula:             [''],
      nombrePreferido:    [''],
      birthDate:          [''],
      email:              [''],
      phone:              [''],
      asistesIglesia:     [false],
      church:             [''],
      perteneceGrupo:     [false],
      nombreLiderGrupo:   [''],
      telefonoLiderGrupo: [''],
      emergencyContactName: [''],
      emergencyContactPhone: [''],
      shirtSize:          [''],
      maritalStatus:      [''],
      country:            [''],
      tribeId:            [''],
    });
  }

  ngOnInit(): void {
    this.participantRegistrationEnabled = this.eventCtx.activeEvent?.participantRegistrationEnabled ?? true;
    this.load();
  }

  get eventId(): string { return this.eventCtx.activeEvent!.id; }

  get publicUrl(): string {
    return `${environment.baseUrl}/registro/senderista/${this.eventId}`;
  }

  load(): void {
    this.loading = true;
    this.participantService.getByEvent(this.eventId).subscribe({
      next: p => { this.participants = p; this.applyFilters(false); this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
    this.tribeService.getByEvent(this.eventId).subscribe(t => { this.tribes = t; this.cdr.detectChanges(); });
  }

  updateRegistrationStatus(): void {
    if (this.updatingRegistrationStatus) return;
    const enabled = this.participantRegistrationEnabled;
    this.updatingRegistrationStatus = true;
    this.eventService.updateRegistrationSettings(this.eventId, { participantRegistrationEnabled: enabled }).subscribe({
      next: event => {
        this.eventCtx.setEvent(event);
        this.updatingRegistrationStatus = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.participantRegistrationEnabled = !enabled;
        this.updatingRegistrationStatus = false;
        this.cdr.detectChanges();
        void this.dialogs.error('No se pudo actualizar el estado del formulario de senderistas.');
      }
    });
  }

  get sinTribuCount(): number {
    return this.participants.filter(p => !p.tribeId).length;
  }

  applyFilters(resetPage = true): void {
    if (resetPage) this.page = 1;
    const q = this.searchTerm.toLowerCase();
    this.filtered = this.participants.filter(p => {
      if (q) {
        const name = `${p.firstLastName} ${p.firstName} ${p.secondLastName ?? ''}`.toLowerCase();
        if (!name.includes(q) && !(p.cedula ?? '').toLowerCase().includes(q)) return false;
      }
      if (this.filterSinTribu && p.tribeId) return false;
      if (this.filterTribeId && p.tribeId !== this.filterTribeId) return false;
      if (this.filterCheckin === 'done'    && !p.checkInCompleted) return false;
      if (this.filterCheckin === 'pending' && p.checkInCompleted)  return false;
      return true;
    }).sort(comparePersonNames);
    this.page = Math.max(1, Math.min(this.page, this.pageCount));
    this.paged = this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }

  toggleSinTribu(): void {
    this.filterSinTribu = !this.filterSinTribu;
    if (this.filterSinTribu) this.filterTribeId = '';
    this.applyFilters();
  }

  setCheckinFilter(v: string): void { this.filterCheckin = this.filterCheckin === v ? '' : v; this.applyFilters(); }

  openDrawer(p: Participant): void { this.drawerParticipant = p; this.drawerOpen = true; }
  closeDrawer(): void { this.drawerOpen = false; }

  onDrawerEdit(p: Participant): void { this.closeDrawer(); this.openEdit(p); }
  onDrawerDelete(id: string): void   { this.closeDrawer(); this.delete(id); }

  onDrawerResendAgreement(p: Participant): void {
    if (this.resendingAgreementId || !p.email) return;
    this.resendingAgreementId = p.id;
    this.participantService.resendAgreement(this.eventId, p.id).subscribe({
      next: () => {
        this.resendingAgreementId = null;
        this.cdr.detectChanges();
        void this.dialogs.success(`El acuerdo fue enviado nuevamente a ${p.email}.`);
      },
      error: err => {
        this.resendingAgreementId = null;
        this.cdr.detectChanges();
        void this.dialogs.error(err.error?.error ?? 'No se pudo reenviar el acuerdo.');
      }
    });
  }

  openCreate(): void {
    this.editingId = null;
    this.bdYear = ''; this.bdMonth = ''; this.bdDay = '';
    this.form.reset();
    this.showForm = true;
  }

  openEdit(p: Participant): void {
    this.editingId = p.id;
    if (p.birthDate) {
      const [y, m, d] = p.birthDate.substring(0, 10).split('-');
      this.bdYear = y; this.bdMonth = m; this.bdDay = String(+d);
    } else {
      this.bdYear = ''; this.bdMonth = ''; this.bdDay = '';
    }
    this.form.patchValue({
      firstName:          p.firstName,
      firstLastName:      p.firstLastName,
      secondLastName:     p.secondLastName,
      cedula:             p.cedula,
      nombrePreferido:    p.nombrePreferido ?? '',
      birthDate:          p.birthDate?.substring(0, 10),
      email:              p.email,
      phone:              p.phone,
      asistesIglesia:     p.asistesIglesia,
      church:             p.church,
      perteneceGrupo:     p.perteneceGrupo,
      nombreLiderGrupo:   p.nombreLiderGrupo ?? '',
      telefonoLiderGrupo: p.telefonoLiderGrupo ?? '',
      emergencyContactName: p.emergencyContactName ?? '',
      emergencyContactPhone: p.emergencyContactPhone ?? '',
      shirtSize:          p.shirtSize,
      maritalStatus:      p.maritalStatus,
      country:            p.country,
      tribeId:            p.tribeId,
    });
    this.showForm = true;
  }

  submit(): void {
    if (this.form.invalid) return;
    const val = this.form.value;
    const existingParticipant = this.editingId ? this.participants.find(p => p.id === this.editingId) : null;
    const payload = this.editingId ? preserveDocumentPaths(val, existingParticipant) : val;

    if (this.editingId) {
      this.participantService.update(this.eventId, this.editingId, payload).subscribe(() => {
        this.showForm = false; this.load();
      });
    } else {
      this.participantService.create(this.eventId, payload).subscribe(() => {
        this.showForm = false; this.load();
      });
    }
  }

  async delete(id: string): Promise<void> {
    if (!(await this.dialogs.confirm('¿Eliminar este senderista?', { title: 'Eliminar registro', confirmText: 'Eliminar', destructive: true }))) return;
    this.cdr.markForCheck();
    this.participantService.delete(this.eventId, id).subscribe(() => this.load());
  }

  cancel(): void { this.showForm = false; this.editingId = null; this.form.reset(); }

  getQrUrl(p: Participant): string {
    return p.qrCode ? `${environment.r2PublicUrl}/qrcodes/${p.eventId}/${p.qrCode}.png` : '';
  }

  getComprobanteUrl(p: Participant): string {
    if (!p.comprobantePagoPath) return '';
    if (p.comprobantePagoPath.startsWith('http')) return p.comprobantePagoPath;
    return `${this.apiUrl.replace('/api', '')}/${p.comprobantePagoPath}`;
  }

  exportExcel(): void {
    const headers = [
      'ID', 'ID evento', 'Nombre', 'Primer apellido', 'Segundo apellido', 'Nombre preferido',
      'Cédula', 'Fecha de nacimiento', 'Edad', 'Estado civil', 'Nombre esposa', 'Teléfono esposa',
      'Consentimiento de datos aceptado', 'Fecha de consentimiento', 'Correo', 'Teléfono',
      'Iglesia', 'Asiste a iglesia', 'Pertenece a grupo', 'Nombre del líder', 'Teléfono del líder',
      'Contacto de emergencia', 'Teléfono de emergencia',
      'País', 'Talla de camisa', 'ID tribu', 'Tribu', 'URL comprobante', 'Código QR',
      'URL acuerdo de participación', 'Check-in completado', 'Fecha de check-in',
      'Medicamentos (JSON)', 'Creado', 'Actualizado'
    ];
    const rows = this.participants.map(p => [
      p.id, p.eventId, p.firstName, p.firstLastName, p.secondLastName, p.nombrePreferido,
      p.cedula, p.birthDate, p.age, p.maritalStatus, p.nombreEsposa, p.telefonoEsposa,
      p.privacyConsentAccepted ? 'Sí' : 'No', p.privacyConsentAt, p.email, p.phone, p.church,
      p.asistesIglesia ? 'Sí' : 'No', p.perteneceGrupo ? 'Sí' : 'No',
      p.nombreLiderGrupo, p.telefonoLiderGrupo, p.emergencyContactName, p.emergencyContactPhone, p.country, p.shirtSize, p.tribeId,
      p.tribeName, this.getComprobanteUrl(p), p.qrCode, this.getAgreementUrl(p),
      p.checkInCompleted ? 'Sí' : 'No', p.checkInDate,
      p.medications?.length ? JSON.stringify(p.medications) : '', p.createdAt, p.updatedAt
    ]);
    const date = new Date().toISOString().slice(0, 10);
    downloadExcelCsv(`senderistas-${exportFileSlug(this.eventCtx.activeEvent?.name)}-${date}.csv`, headers, rows);
  }

  private getAgreementUrl(p: Participant): string {
    return p.qrCode ? `${environment.r2PublicUrl}/pdfs/${p.eventId}/${p.qrCode}.pdf` : '';
  }

  copyUrl(): void {
    navigator.clipboard.writeText(this.publicUrl).then(() => {
      this.copied = true;
      setTimeout(() => { this.copied = false; this.cdr.detectChanges(); }, 2000);
      this.cdr.detectChanges();
    });
  }
}
