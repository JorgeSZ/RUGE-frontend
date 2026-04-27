import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EvTaskService } from '../../core/services/ev-task.service';
import { EventContextService } from '../../core/services/event-context.service';
import { EvTaskDto, EvTaskSegmentDetailResponse } from '../../core/models/ev-task.model';

@Component({
  selector: 'app-ev-tasks-detail',
  templateUrl: './ev-tasks-detail.component.html',
  styleUrls: ['./ev-tasks-detail.component.css'],
  standalone: false
})
export class EvTasksDetailComponent implements OnInit {
  segmentId = '';
  detail: EvTaskSegmentDetailResponse | null = null;
  loading = true;

  get eventId(): string { return this.eventCtx.activeEvent!.id; }

  showForm = false;
  editTarget: EvTaskDto | null = null;
  taskForm!: FormGroup;
  saving = false;

  statusTarget: EvTaskDto | null = null;
  statusForm!: FormGroup;
  statusSaving = false;

  showBulk = false;
  bulkText = '';
  bulkSaving = false;

  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any;

  constructor(
    public eventCtx: EventContextService,
    private evTaskService: EvTaskService,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.segmentId = this.route.snapshot.paramMap.get('segmentId') ?? '';
    this.buildTaskForm();
    this.buildStatusForm();
    this.load();
  }

  load(): void {
    this.loading = true;
    this.evTaskService.getBySegment(this.eventId, this.segmentId).subscribe({
      next: res => { this.detail = res; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  // — Add / Edit —

  openAdd(): void {
    this.editTarget = null;
    this.taskForm.reset({ esObligatorio: true });
    this.showForm = true;
  }

  openEdit(task: EvTaskDto): void {
    this.editTarget = task;
    this.taskForm.patchValue({
      nombre: task.nombre,
      descripcion: task.descripcion ?? '',
      responsable: task.responsable ?? '',
      esObligatorio: task.esObligatorio,
    });
    this.showForm = true;
  }

  saveTask(): void {
    if (this.taskForm.invalid) return;
    this.saving = true;
    const v = this.taskForm.value;
    const req = {
      nombre: v.nombre,
      descripcion: v.descripcion || undefined,
      responsable: v.responsable || undefined,
      esObligatorio: !!v.esObligatorio,
    };

    const obs = this.editTarget
      ? this.evTaskService.update(this.eventId, this.editTarget.id, req)
      : this.evTaskService.create(this.eventId, this.segmentId, req);

    obs.subscribe({
      next: () => { this.saving = false; this.showForm = false; this.load(); this.showToast('Guardado', 'success'); },
      error: () => { this.saving = false; this.showToast('Error al guardar', 'error'); }
    });
  }

  deleteTask(task: EvTaskDto): void {
    if (!confirm(`¿Eliminar "${task.nombre}"?`)) return;
    this.evTaskService.delete(this.eventId, task.id).subscribe({
      next: () => { this.load(); this.showToast('Eliminada', 'success'); },
      error: () => this.showToast('Error al eliminar', 'error')
    });
  }

  // — Status toggle —

  toggleStatus(task: EvTaskDto): void {
    if (!task.completado) {
      this.statusTarget = task;
      this.statusForm.reset({ completadoPor: '', notas: '' });
    } else {
      this.applyStatus(task, false);
    }
  }

  confirmStatus(): void {
    if (!this.statusTarget) return;
    this.statusSaving = true;
    const v = this.statusForm.value;
    this.applyStatus(this.statusTarget, true, v.completadoPor || undefined, v.notas || undefined);
  }

  private applyStatus(task: EvTaskDto, completado: boolean, completadoPor?: string, notas?: string): void {
    this.evTaskService.updateStatus(this.eventId, task.id, { completado, completadoPor, notas }).subscribe({
      next: () => {
        this.statusSaving = false;
        this.statusTarget = null;
        this.load();
        this.showToast(completado ? 'Marcada como completada' : 'Marcada como pendiente', 'success');
      },
      error: () => { this.statusSaving = false; this.showToast('Error al actualizar', 'error'); }
    });
  }

  // — Reorder —

  moveUp(task: EvTaskDto): void {
    if (!this.detail) return;
    const tasks = [...this.detail.tasks].sort((a, b) => a.orden - b.orden);
    const idx = tasks.findIndex(t => t.id === task.id);
    if (idx <= 0) return;
    this.swapOrder(task, tasks[idx - 1]);
  }

  moveDown(task: EvTaskDto): void {
    if (!this.detail) return;
    const tasks = [...this.detail.tasks].sort((a, b) => a.orden - b.orden);
    const idx = tasks.findIndex(t => t.id === task.id);
    if (idx < 0 || idx >= tasks.length - 1) return;
    this.swapOrder(task, tasks[idx + 1]);
  }

  private swapOrder(a: EvTaskDto, b: EvTaskDto): void {
    const ordA = a.orden;
    this.evTaskService.reorder(this.eventId, a.id, b.orden).subscribe({
      next: () => this.evTaskService.reorder(this.eventId, b.id, ordA).subscribe({
        next: () => this.load()
      })
    });
  }

  // — Bulk import —

  parseBulk(): void {
    if (!this.bulkText.trim()) return;
    this.bulkSaving = true;
    const lines = this.bulkText.trim().split('\n').filter(l => l.trim());
    const tasks = lines.map((l, i) => {
      const [nombre, descripcion, responsable, obligatorioStr] = l.split(',').map(s => s.trim());
      const esObligatorio = obligatorioStr?.toLowerCase() !== 'no';
      return {
        nombre: nombre || `Tarea ${i + 1}`,
        descripcion: descripcion || undefined,
        responsable: responsable || undefined,
        esObligatorio,
      };
    });

    this.evTaskService.bulkImport(this.eventId, this.segmentId, tasks).subscribe({
      next: () => {
        this.bulkSaving = false; this.showBulk = false; this.bulkText = '';
        this.load(); this.showToast(`${tasks.length} tareas importadas`, 'success');
      },
      error: () => { this.bulkSaving = false; this.showToast('Error en importación', 'error'); }
    });
  }

  exportCsv(): void {
    window.open(this.evTaskService.exportCsvUrl(this.eventId, this.segmentId), '_blank');
  }

  private buildTaskForm(): void {
    this.taskForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(200)]],
      descripcion: [''],
      responsable: [''],
      esObligatorio: [true],
    });
  }

  private buildStatusForm(): void {
    this.statusForm = this.fb.group({ completadoPor: [''], notas: [''] });
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    clearTimeout(this.toastTimer);
    this.toast = { message, type };
    this.cdr.detectChanges();
    this.toastTimer = setTimeout(() => { this.toast = null; this.cdr.detectChanges(); }, 3000);
  }
}
