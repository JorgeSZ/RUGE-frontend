import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LogisticsService } from '../../core/services/logistics.service';
import { EventContextService } from '../../core/services/event-context.service';
import {
  LogisticSegmentDetailResponse,
  LogisticGroupDto,
  LogisticItemDto,
  LOGISTIC_TIPOS,
} from '../../core/models/logistic.model';

@Component({
  selector: 'app-logistics-detail',
  templateUrl: './logistics-detail.component.html',
  styleUrls: ['./logistics-detail.component.css'],
  standalone: false
})
export class LogisticsDetailComponent implements OnInit {
  segmentId = '';
  detail: LogisticSegmentDetailResponse | null = null;
  loading = true;
  tipos = LOGISTIC_TIPOS;

  /** true = view with event status; false = track config only */
  get hasEvent(): boolean { return !!this.eventCtx.activeEvent; }
  get eventId(): string { return this.eventCtx.activeEvent!.id; }

  activeTab = 'all';

  showForm = false;
  editTarget: LogisticItemDto | null = null;
  itemForm!: FormGroup;
  saving = false;

  statusTarget: LogisticItemDto | null = null;
  statusForm!: FormGroup;
  statusSaving = false;

  showBulk = false;
  bulkText = '';
  bulkSaving = false;

  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any;

  constructor(
    public eventCtx: EventContextService,
    private logisticsService: LogisticsService,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.segmentId = this.route.snapshot.paramMap.get('segmentId') ?? '';
    this.buildItemForm();
    this.buildStatusForm();
    this.load();
  }

  get visibleGroups(): LogisticGroupDto[] {
    if (!this.detail) return [];
    if (this.activeTab === 'all') return this.detail.groups;
    return this.detail.groups.filter(g => g.tipo.toLowerCase() === this.activeTab.toLowerCase());
  }

  load(): void {
    this.loading = true;
    const obs = this.hasEvent
      ? this.logisticsService.getBySegmentForEvent(this.eventId, this.segmentId)
      : this.logisticsService.getBySegment(this.segmentId);

    obs.subscribe({
      next: res => { this.detail = res; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  // — Add/Edit (track-scoped) —

  openAdd(): void {
    this.editTarget = null;
    this.itemForm.reset({ cantidad: 1, esObligatorio: false, tipo: 'Material' });
    this.showForm = true;
  }

  openEdit(item: LogisticItemDto): void {
    this.editTarget = item;
    this.itemForm.patchValue({
      nombre: item.nombre,
      descripcion: item.descripcion ?? '',
      tipo: item.tipo,
      cantidad: item.cantidad,
      unidad: item.unidad ?? '',
      responsable: item.responsable ?? '',
      esObligatorio: item.esObligatorio,
    });
    this.showForm = true;
  }

  saveItem(): void {
    if (this.itemForm.invalid) return;
    this.saving = true;
    const v = this.itemForm.value;
    const req = {
      nombre: v.nombre,
      descripcion: v.descripcion || undefined,
      tipo: v.tipo,
      cantidad: +v.cantidad,
      unidad: v.unidad || undefined,
      responsable: v.responsable || undefined,
      esObligatorio: !!v.esObligatorio,
    };

    const obs = this.editTarget
      ? this.logisticsService.update(this.editTarget.id, req)
      : this.logisticsService.create(this.segmentId, req);

    obs.subscribe({
      next: () => { this.saving = false; this.showForm = false; this.load(); this.showToast('Guardado', 'success'); },
      error: () => { this.saving = false; this.showToast('Error al guardar', 'error'); }
    });
  }

  deleteItem(item: LogisticItemDto): void {
    if (!confirm(`¿Eliminar "${item.nombre}"?`)) return;
    this.logisticsService.delete(item.id).subscribe({
      next: () => { this.load(); this.showToast('Eliminado', 'success'); },
      error: () => this.showToast('Error al eliminar', 'error')
    });
  }

  // — Status toggle (event-scoped) —

  toggleStatus(item: LogisticItemDto): void {
    if (!this.hasEvent) return;
    if (!item.completado) {
      this.statusTarget = item;
      this.statusForm.reset({ completadoPor: '', notas: '' });
    } else {
      this.applyStatus(item, false, undefined, undefined);
    }
  }

  confirmStatus(): void {
    if (!this.statusTarget || !this.hasEvent) return;
    this.statusSaving = true;
    const v = this.statusForm.value;
    this.applyStatus(this.statusTarget, true, v.completadoPor || undefined, v.notas || undefined);
  }

  private applyStatus(item: LogisticItemDto, completado: boolean, completadoPor?: string, notas?: string): void {
    this.logisticsService.updateStatus(this.eventId, item.id, { completado, completadoPor, notas }).subscribe({
      next: () => {
        this.statusSaving = false;
        this.statusTarget = null;
        this.load();
        this.showToast(completado ? 'Marcado como completado' : 'Marcado como pendiente', 'success');
      },
      error: () => { this.statusSaving = false; this.showToast('Error al actualizar', 'error'); }
    });
  }

  // — Bulk import (track-scoped) —

  parseBulk(): void {
    if (!this.bulkText.trim()) return;
    this.bulkSaving = true;
    const lines = this.bulkText.trim().split('\n').filter(l => l.trim());
    const items = lines.map((l, i) => {
      const [nombre, tipo, cantStr, unidad, responsable] = l.split(',').map(s => s.trim());
      return {
        nombre: nombre || `Item ${i + 1}`,
        tipo: this.tipos.includes(tipo as any) ? tipo : 'Material',
        cantidad: parseInt(cantStr) || 1,
        unidad: unidad || undefined,
        responsable: responsable || undefined,
        esObligatorio: false,
      };
    });

    this.logisticsService.bulkImport(this.segmentId, items).subscribe({
      next: () => { this.bulkSaving = false; this.showBulk = false; this.bulkText = ''; this.load(); this.showToast(`${items.length} ítems importados`, 'success'); },
      error: () => { this.bulkSaving = false; this.showToast('Error en importación', 'error'); }
    });
  }

  exportCsv(): void {
    window.open(this.logisticsService.exportCsvUrl(this.segmentId), '_blank');
  }

  private buildItemForm(): void {
    this.itemForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(200)]],
      descripcion: [''],
      tipo: ['Material', Validators.required],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      unidad: [''],
      responsable: [''],
      esObligatorio: [false],
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
