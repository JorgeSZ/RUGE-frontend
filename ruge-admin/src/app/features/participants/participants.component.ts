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

  openCreate(): void { this.editingId = null; this.form.reset(); this.showForm = true; }

  openEdit(p: Participant): void {
    this.editingId = p.id;
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

  copyUrl(): void {
    navigator.clipboard.writeText(this.publicUrl).then(() => {
      this.copied = true;
      setTimeout(() => { this.copied = false; this.cdr.detectChanges(); }, 2000);
      this.cdr.detectChanges();
    });
  }
}
