import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TribeService } from '../../core/services/tribe.service';
import { ParticipantService } from '../../core/services/participant.service';
import { EventContextService } from '../../core/services/event-context.service';
import { Tribe } from '../../core/models/tribe.model';

@Component({
  selector: 'app-tribes',
  templateUrl: './tribes.component.html',
  styleUrls: ['./tribes.component.css'],
  standalone: false
})
export class TribesComponent implements OnInit {
  tribes: Tribe[] = [];
  loading = false;

  // Manual create/edit form
  showForm = false;
  editingId: string | null = null;
  form: FormGroup;

  // Auto-generate modal
  showAutoGenModal = false;
  autoGenForm: FormGroup;
  participantCount = 0;
  autoGenLoading = false;

  // Delete all dialog
  showDeleteAllDialog = false;
  deleteAllLoading = false;

  // Toast
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any;

  constructor(
    private fb: FormBuilder,
    private tribeService: TribeService,
    private participantService: ParticipantService,
    public eventCtx: EventContextService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      color: [''],
    });
    this.autoGenForm = this.fb.group({
      senderistasPerTribe: [10, [Validators.required, Validators.min(2)]],
    });
  }

  ngOnInit(): void { this.load(); }

  get eventId(): string { return this.eventCtx.activeEvent!.id; }

  get hasTribes(): boolean { return this.tribes.length > 0; }

  get previewTribes(): number {
    const val = this.autoGenForm.get('senderistasPerTribe')?.value;
    if (!val || val < 2 || this.participantCount === 0) return 0;
    return Math.ceil(this.participantCount / val);
  }

  load(): void {
    if (!this.eventCtx.activeEvent) return;
    this.loading = true;
    this.tribeService.getByEvent(this.eventId).subscribe({
      next: t => { this.tribes = t; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  // Manual form
  openCreate(): void { this.editingId = null; this.form.reset(); this.showForm = true; }
  openEdit(t: Tribe): void { this.editingId = t.id; this.form.patchValue(t); this.showForm = true; }
  cancelForm(): void { this.showForm = false; this.editingId = null; this.form.reset(); }

  submit(): void {
    if (this.form.invalid) return;
    const val = this.form.value;
    if (this.editingId) {
      this.tribeService.update(this.eventId, this.editingId, val).subscribe(() => {
        this.showForm = false;
        this.load();
        this.showToast('Tribu actualizada.', 'success');
      });
    } else {
      this.tribeService.create(this.eventId, val).subscribe(() => {
        this.showForm = false;
        this.load();
        this.showToast('Tribu creada.', 'success');
      });
    }
  }

  delete(id: string): void {
    if (!confirm('¿Eliminar esta tribu?')) return;
    this.tribeService.delete(this.eventId, id).subscribe(() => {
      this.load();
      this.showToast('Tribu eliminada.', 'success');
    });
  }

  // Auto-generate
  openAutoGen(): void {
    this.autoGenForm.patchValue({ senderistasPerTribe: 10 });
    this.participantCount = 0;
    this.showAutoGenModal = true;
    this.participantService.getByEvent(this.eventId).subscribe({
      next: p => { this.participantCount = p.length; this.cdr.detectChanges(); },
    });
  }

  cancelAutoGen(): void { this.showAutoGenModal = false; }

  confirmAutoGen(): void {
    if (this.autoGenForm.invalid || this.hasTribes) return;
    this.autoGenLoading = true;
    this.tribeService.autoGenerate(this.eventId, this.autoGenForm.value).subscribe({
      next: res => {
        this.autoGenLoading = false;
        this.showAutoGenModal = false;
        this.load();
        const perTribe = res.tribes[0]?.participantCount ?? '?';
        this.showToast(`${res.tribesCreated} tribus creadas con ~${perTribe} senderistas cada una.`, 'success');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.autoGenLoading = false;
        const msg = err?.error?.error ?? 'Error al auto-generar tribus.';
        this.showToast(msg, 'error');
        this.cdr.detectChanges();
      }
    });
  }

  // Delete all
  openDeleteAll(): void { this.showDeleteAllDialog = true; }
  cancelDeleteAll(): void { this.showDeleteAllDialog = false; }

  confirmDeleteAll(): void {
    this.deleteAllLoading = true;
    this.tribeService.deleteAll(this.eventId).subscribe({
      next: () => {
        this.deleteAllLoading = false;
        this.showDeleteAllDialog = false;
        this.load();
        this.showToast('Todas las tribus fueron eliminadas.', 'success');
        this.cdr.detectChanges();
      },
      error: () => {
        this.deleteAllLoading = false;
        this.showToast('Error al eliminar tribus.', 'error');
        this.cdr.detectChanges();
      }
    });
  }

  // Toast
  showToast(message: string, type: 'success' | 'error'): void {
    clearTimeout(this.toastTimer);
    this.toast = { message, type };
    this.toastTimer = setTimeout(() => { this.toast = null; this.cdr.detectChanges(); }, 4000);
  }
}
