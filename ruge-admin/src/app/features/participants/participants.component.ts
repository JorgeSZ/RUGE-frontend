import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ParticipantService } from '../../core/services/participant.service';
import { TribeService } from '../../core/services/tribe.service';
import { EventContextService } from '../../core/services/event-context.service';
import { Participant } from '../../core/models/participant.model';
import { Tribe } from '../../core/models/tribe.model';
import { environment } from '../../../environments/environment';

const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const MARITAL_STATUSES = ['Soltero', 'Casado', 'Divorciado', 'Viudo', 'Unión libre'];

@Component({
  selector: 'app-participants',
  templateUrl: './participants.component.html',
  styleUrls: ['./participants.component.css'],
  standalone: false
})
export class ParticipantsComponent implements OnInit {
  participants: Participant[] = [];
  tribes: Tribe[] = [];
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

  // Drawer
  drawerOpen = false;
  drawerParticipant: import('../../core/models/participant.model').Participant | null = null;

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
      shirtSize:          [''],
      maritalStatus:      [''],
      country:            [''],
      tribeId:            [''],
    });
  }

  ngOnInit(): void { this.load(); }

  get eventId(): string { return this.eventCtx.activeEvent!.id; }

  get publicUrl(): string {
    return `${environment.baseUrl}/registro/senderista/${this.eventId}`;
  }

  load(): void {
    this.loading = true;
    this.participantService.getByEvent(this.eventId).subscribe({
      next: p => { this.participants = p; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
    this.tribeService.getByEvent(this.eventId).subscribe(t => { this.tribes = t; this.cdr.detectChanges(); });
  }

  get sinTribuCount(): number {
    return this.participants.filter(p => !p.tribeId).length;
  }

  get filtered(): Participant[] {
    const q = this.searchTerm.toLowerCase();
    return this.participants.filter(p => {
      if (q) {
        const name = `${p.firstLastName} ${p.firstName} ${p.secondLastName ?? ''}`.toLowerCase();
        if (!name.includes(q) && !(p.cedula ?? '').toLowerCase().includes(q)) return false;
      }
      if (this.filterSinTribu && p.tribeId) return false;
      if (this.filterTribeId && p.tribeId !== this.filterTribeId) return false;
      if (this.filterCheckin === 'done'    && !p.checkInCompleted) return false;
      if (this.filterCheckin === 'pending' && p.checkInCompleted)  return false;
      return true;
    });
  }

  toggleSinTribu(): void {
    this.filterSinTribu = !this.filterSinTribu;
    if (this.filterSinTribu) this.filterTribeId = '';
  }

  setCheckinFilter(v: string): void { this.filterCheckin = this.filterCheckin === v ? '' : v; }

  openDrawer(p: Participant): void { this.drawerParticipant = p; this.drawerOpen = true; }
  closeDrawer(): void { this.drawerOpen = false; }

  onDrawerEdit(p: Participant): void { this.closeDrawer(); this.openEdit(p); }
  onDrawerDelete(id: string): void   { this.closeDrawer(); this.delete(id); }

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
    if (this.editingId) {
      this.participantService.update(this.eventId, this.editingId, val).subscribe(() => {
        this.showForm = false; this.load();
      });
    } else {
      this.participantService.create(this.eventId, val).subscribe(() => {
        this.showForm = false; this.load();
      });
    }
  }

  delete(id: string): void {
    if (!confirm('¿Eliminar este senderista?')) return;
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

  copyUrl(): void {
    navigator.clipboard.writeText(this.publicUrl).then(() => {
      this.copied = true;
      setTimeout(() => { this.copied = false; this.cdr.detectChanges(); }, 2000);
      this.cdr.detectChanges();
    });
  }
}
