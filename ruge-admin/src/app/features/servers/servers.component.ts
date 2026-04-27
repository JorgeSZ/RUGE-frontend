import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ServerService } from '../../core/services/server.service';
import { CommissionService } from '../../core/services/commission.service';
import { TribeService } from '../../core/services/tribe.service';
import { EventContextService } from '../../core/services/event-context.service';
import { Server } from '../../core/models/server.model';
import { Commission } from '../../core/models/commission.model';
import { Tribe } from '../../core/models/tribe.model';
import { environment } from '../../../environments/environment';

const MARITAL_STATUSES = ['Soltero/a', 'Casado/a', 'Divorciado/a', 'Viudo/a', 'Unión libre'];

@Component({
  selector: 'app-servers',
  templateUrl: './servers.component.html',
  styleUrls: ['./servers.component.css'],
  standalone: false
})
export class ServersComponent implements OnInit {
  servers: Server[] = [];
  commissions: Commission[] = [];
  tribes: Tribe[] = [];
  loading = false;
  showForm = false;
  editingId: string | null = null;
  reassigningId: string | null = null;
  form: FormGroup;
  reassignForm: FormGroup;
  maritalStatuses = MARITAL_STATUSES;
  filterCommissionId = '';
  apiUrl = environment.apiUrl;
  copied = false;

  constructor(
    private fb: FormBuilder,
    private serverService: ServerService,
    private commissionService: CommissionService,
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
      maritalStatus: [''],
      country: [''],
      commissionId: [''],
      tribeId: [''],
      hasDiscipleship: [false],
      hasDiscipleshipPatch: [false],
      hasGroup: [false],
    });
    this.reassignForm = this.fb.group({
      commissionId: ['', Validators.required],
    });
  }

  ngOnInit(): void { this.load(); }

  get eventId(): string { return this.eventCtx.activeEvent!.id; }

  get publicUrl(): string {
    return `${environment.baseUrl}/registro/servidor/${this.eventId}`;
  }

  load(): void {
    this.loading = true;
    this.serverService.getByEvent(this.eventId).subscribe({
      next: s => { this.servers = s; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
    this.commissionService.getAll().subscribe(c => { this.commissions = c; this.cdr.detectChanges(); });
    this.tribeService.getByEvent(this.eventId).subscribe(t => { this.tribes = t; this.cdr.detectChanges(); });
  }

  get filtered(): Server[] {
    if (!this.filterCommissionId) return this.servers;
    return this.servers.filter(s => s.commissionId === this.filterCommissionId);
  }

  openCreate(): void {
    this.editingId = null;
    this.form.reset({ hasDiscipleship: false, hasDiscipleshipPatch: false, hasGroup: false });
    this.showForm = true;
  }

  openEdit(s: Server): void {
    this.editingId = s.id;
    this.form.patchValue({
      firstName: s.firstName,
      firstLastName: s.firstLastName,
      secondLastName: s.secondLastName,
      cedula: s.cedula,
      birthDate: s.birthDate?.substring(0, 10),
      email: s.email,
      phone: s.phone,
      church: s.church,
      maritalStatus: s.maritalStatus,
      country: s.country,
      commissionId: s.commissionId,
      tribeId: s.tribeId,
      hasDiscipleship: s.hasDiscipleship,
      hasDiscipleshipPatch: s.hasDiscipleshipPatch,
      hasGroup: s.hasGroup,
    });
    this.showForm = true;
  }

  submit(): void {
    if (this.form.invalid) return;
    const val = this.form.value;
    if (this.editingId) {
      this.serverService.update(this.eventId, this.editingId, val).subscribe(() => {
        this.showForm = false; this.editingId = null; this.load();
      });
    } else {
      this.serverService.create(this.eventId, val).subscribe(() => {
        this.showForm = false; this.load();
      });
    }
  }

  openReassign(s: Server): void {
    this.reassigningId = s.id;
    this.reassignForm.setValue({ commissionId: s.commissionId ?? '' });
  }

  confirmReassign(): void {
    if (!this.reassigningId || this.reassignForm.invalid) return;
    this.serverService.reassignCommission(this.eventId, this.reassigningId, this.reassignForm.value.commissionId)
      .subscribe(() => { this.reassigningId = null; this.load(); });
  }

  delete(id: string): void {
    if (!confirm('¿Eliminar este servidor?')) return;
    this.serverService.delete(this.eventId, id).subscribe(() => this.load());
  }

  cancel(): void { this.showForm = false; this.editingId = null; this.form.reset(); }

  getQrUrl(s: Server): string {
    return s.qrCode ? `${this.apiUrl.replace('/api', '')}/uploads/qrcodes/${s.eventId}/${s.qrCode}.png` : '';
  }

  copyUrl(): void {
    navigator.clipboard.writeText(this.publicUrl).then(() => {
      this.copied = true;
      setTimeout(() => { this.copied = false; this.cdr.detectChanges(); }, 2000);
      this.cdr.detectChanges();
    });
  }
}
