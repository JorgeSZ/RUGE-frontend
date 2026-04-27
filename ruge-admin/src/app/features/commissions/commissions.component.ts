import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommissionService } from '../../core/services/commission.service';
import { EventContextService } from '../../core/services/event-context.service';
import { Commission } from '../../core/models/commission.model';
import { Server } from '../../core/models/server.model';

const COMMISSION_COLORS = [
  '#4f46e5', '#0ea5e9', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'
];

@Component({
  selector: 'app-commissions',
  templateUrl: './commissions.component.html',
  styleUrls: ['./commissions.component.css'],
  standalone: false
})
export class CommissionsComponent implements OnInit {
  commissions: Commission[] = [];
  selectedCommission: Commission | null = null;
  commissionServers: Server[] = [];
  loading = false;
  loadingServers = false;
  showForm = false;
  editingId: string | null = null;
  toast = '';
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private commissionService: CommissionService,
    public eventCtx: EventContextService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
    });
  }

  ngOnInit(): void { this.load(); }

  get eventId(): string { return this.eventCtx.activeEvent?.id ?? ''; }

  get hasActiveEvent(): boolean { return !!this.eventCtx.activeEvent; }

  load(): void {
    if (!this.hasActiveEvent) return;
    this.loading = true;
    this.commissionService.getAll(this.eventId).subscribe({
      next: c => { this.commissions = c; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  getColor(index: number): string {
    return COMMISSION_COLORS[index % COMMISSION_COLORS.length];
  }

  openDetail(commission: Commission): void {
    this.selectedCommission = commission;
    this.loadingServers = true;
    this.commissionServers = [];
    this.commissionService.getServers(commission.id, this.eventId).subscribe({
      next: s => { this.commissionServers = s; this.loadingServers = false; this.cdr.detectChanges(); },
      error: () => { this.loadingServers = false; this.cdr.detectChanges(); }
    });
  }

  backToGrid(): void {
    this.selectedCommission = null;
    this.commissionServers = [];
  }

  openCreate(): void {
    this.editingId = null;
    this.form.reset();
    this.showForm = true;
  }

  openEdit(c: Commission): void {
    this.editingId = c.id;
    this.form.patchValue({ name: c.name, description: c.description });
    this.showForm = true;
  }

  submit(): void {
    if (this.form.invalid) return;
    const val = this.form.value;
    if (this.editingId) {
      this.commissionService.update(this.editingId, val).subscribe({
        next: () => { this.showForm = false; this.editingId = null; this.load(); this.showToast('Comisión actualizada'); },
        error: err => this.showToast(err.error?.error ?? 'Error al actualizar', true)
      });
    } else {
      this.commissionService.create(val).subscribe({
        next: () => { this.showForm = false; this.load(); this.showToast('Comisión creada'); },
        error: err => this.showToast(err.error?.error ?? 'Error al crear', true)
      });
    }
  }

  delete(id: string): void {
    if (!confirm('¿Eliminar esta comisión? Solo es posible si no tiene servidores asignados.')) return;
    this.commissionService.delete(id).subscribe({
      next: () => { this.load(); this.showToast('Comisión eliminada'); },
      error: err => this.showToast(err.error?.error ?? 'Error al eliminar', true)
    });
  }

  cancel(): void { this.showForm = false; this.editingId = null; this.form.reset(); }

  private showToast(msg: string, isError = false): void {
    this.toast = msg;
    this.cdr.detectChanges();
    setTimeout(() => { this.toast = ''; this.cdr.detectChanges(); }, 3000);
  }
}
