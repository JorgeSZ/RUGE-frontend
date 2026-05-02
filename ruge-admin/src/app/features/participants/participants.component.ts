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
  filterSinTribu = false;
  apiUrl = environment.apiUrl;
  copied = false;

  readonly years = Array.from({length: new Date().getFullYear() - 1929}, (_, i) => new Date().getFullYear() - i);
  readonly months = [
    {v:'01',l:'Enero'},{v:'02',l:'Febrero'},{v:'03',l:'Marzo'},{v:'04',l:'Abril'},
    {v:'05',l:'Mayo'},{v:'06',l:'Junio'},{v:'07',l:'Julio'},{v:'08',l:'Agosto'},
    {v:'09',l:'Septiembre'},{v:'10',l:'Octubre'},{v:'11',l:'Noviembre'},{v:'12',l:'Diciembre'},
  ];
  bdYear = ''; bdMonth = ''; bdDay = '';

  get bdDays(): number[] {
    if (!this.bdYear || !this.bdMonth) return Array.from({length: 31}, (_, i) => i + 1);
    return Array.from({length: new Date(+this.bdYear, +this.bdMonth, 0).getDate()}, (_, i) => i + 1);
  }

  onBdChange(): void {
    if (this.bdYear && this.bdMonth && this.bdDay) {
      if (+this.bdDay > this.bdDays.length) this.bdDay = '';
    }
    const v = (this.bdYear && this.bdMonth && this.bdDay)
      ? `${this.bdYear}-${this.bdMonth}-${String(+this.bdDay).padStart(2,'0')}`
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
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      firstLastName: ['', [Validators.required, Validators.minLength(2)]],
      secondLastName: [''],
      cedula: [''],
      birthDate: [''],
      email: [''],
      phone: [''],
      church: [''],
      shirtSize: [''],
      maritalStatus: [''],
      country: [''],
      tribeId: [''],
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
    let result = this.participants;
    if (this.filterSinTribu) return result.filter(p => !p.tribeId);
    if (this.filterTribeId) return result.filter(p => p.tribeId === this.filterTribeId);
    return result;
  }

  toggleSinTribu(): void {
    this.filterSinTribu = !this.filterSinTribu;
    if (this.filterSinTribu) this.filterTribeId = '';
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
      firstName: p.firstName,
      firstLastName: p.firstLastName,
      secondLastName: p.secondLastName,
      cedula: p.cedula,
      birthDate: p.birthDate?.substring(0, 10),
      email: p.email,
      phone: p.phone,
      church: p.church,
      shirtSize: p.shirtSize,
      maritalStatus: p.maritalStatus,
      country: p.country,
      tribeId: p.tribeId,
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
    return p.qrCode ? `${this.apiUrl.replace('/api', '')}/uploads/qrcodes/${p.eventId}/${p.qrCode}.png` : '';
  }

  getComprobanteUrl(p: Participant): string {
    return p.comprobantePagoPath ? `${this.apiUrl.replace('/api', '')}/${p.comprobantePagoPath}` : '';
  }

  copyUrl(): void {
    navigator.clipboard.writeText(this.publicUrl).then(() => {
      this.copied = true;
      setTimeout(() => { this.copied = false; this.cdr.detectChanges(); }, 2000);
      this.cdr.detectChanges();
    });
  }
}
