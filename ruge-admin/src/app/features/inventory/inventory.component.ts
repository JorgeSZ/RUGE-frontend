import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TimeoutError, finalize, timeout } from 'rxjs';
import { InventoryItem, InventoryItemInput } from '../../core/models/inventory.model';
import { InventoryService } from '../../core/services/inventory.service';

@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.css'],
  standalone: false
})
export class InventoryComponent implements OnInit {
  readonly categories = ['Herramientas', 'Insumos', 'Eventos', 'Cocina', 'MRE'];
  items: InventoryItem[] = [];
  loading = false;
  loadError = false;
  search = '';
  showForm = false;
  editingId: string | null = null;
  saving = false;
  form: FormGroup;
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private fb: FormBuilder,
    private inventoryService: InventoryService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      prioridad: [''],
      articulo: ['', [Validators.required, Validators.maxLength(200)]],
      categoria: ['', [Validators.required, Validators.maxLength(100)]],
      cantidad: [1, [Validators.required, Validators.min(0)]],
      estado: [''],
      bodegaEn: [''],
      localizador: [''],
      fechaIngresoAInventario: [''],
      notas: [''],
    });
  }

  ngOnInit(): void { this.load(); }

  get filteredItems(): InventoryItem[] {
    const term = this.search.trim().toLocaleLowerCase();
    if (!term) return this.items;
    return this.items.filter(item => {
      const values = [
        item.prioridad, item.articulo, item.categoria, item.cantidad, item.estado, item.bodegaEn,
        item.localizador, item.fechaIngresoAInventario, item.notas,
        ...item.usosEnEventos.flatMap(usage => [usage.eventName, usage.cantidad]),
      ];
      return values.some(value => value != null && String(value).toLocaleLowerCase().includes(term));
    });
  }

  load(): void {
    this.loading = true;
    this.loadError = false;
    this.inventoryService.getAll().subscribe({
      next: items => { this.items = items; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.loadError = true; this.cdr.detectChanges(); }
    });
  }

  openCreate(): void {
    this.editingId = null;
    this.form.reset({
      prioridad: '', articulo: '', categoria: '', cantidad: 1, estado: '', bodegaEn: '',
      localizador: '', fechaIngresoAInventario: '', notas: ''
    });
    this.showForm = true;
  }

  openEdit(item: InventoryItem): void {
    this.editingId = item.id;
    this.form.reset({
      prioridad: item.prioridad,
      articulo: item.articulo,
      categoria: item.categoria,
      cantidad: item.cantidad,
      estado: item.estado,
      bodegaEn: item.bodegaEn ?? '',
      localizador: item.localizador ?? '',
      fechaIngresoAInventario: this.dateInput(item.fechaIngresoAInventario),
      notas: item.notas ?? '',
    });
    this.showForm = true;
  }

  cancel(): void { this.showForm = false; this.editingId = null; }

  submit(): void {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    const input = this.toInput(this.form.getRawValue());
    this.saving = true;
    const editing = !!this.editingId;
    const request = this.editingId
      ? this.inventoryService.update(this.editingId, input)
      : this.inventoryService.create(input);
    request.pipe(
      timeout({ first: 30000 }),
      finalize(() => {
        this.saving = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => {
        this.showForm = false;
        this.editingId = null;
        this.load();
        this.showToast(editing ? 'Artículo actualizado.' : 'Artículo agregado al inventario.', 'success');
      },
      error: error => {
        const message = error instanceof TimeoutError
          ? 'El servidor no confirmó el guardado en 30 segundos. Actualiza el inventario antes de volver a intentarlo.'
          : 'No se pudo guardar. Revisa el stock asignado a eventos.';
        this.showToast(message, 'error');
      }
    });
  }

  delete(item: InventoryItem): void {
    if (!confirm(`¿Eliminar "${item.articulo}" del inventario?`)) return;
    this.inventoryService.delete(item.id).subscribe({
      next: () => { this.items = this.items.filter(x => x.id !== item.id); this.showToast('Artículo eliminado.', 'success'); },
      error: error => this.showToast(
        error?.error?.error ?? 'No se pudo eliminar el artículo. Verifica que todas sus salidas estén devueltas.',
        'error'
      )
    });
  }

  formatDate(value: string | null): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat('es-CR', { dateStyle: 'short', timeZone: 'UTC' }).format(new Date(value));
  }

  showToast(message: string, type: 'success' | 'error'): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = { message, type };
    this.cdr.detectChanges();
    this.toastTimer = setTimeout(() => { this.toast = null; this.cdr.detectChanges(); }, 3500);
  }

  private dateInput(value: string | null): string { return value ? value.substring(0, 10) : ''; }

  private toInput(value: Record<string, unknown>): InventoryItemInput {
    const optional = (key: string) => value[key] ? String(value[key]).trim() : null;
    return {
      prioridad: String(value['prioridad'] ?? '').trim(),
      articulo: String(value['articulo'] ?? '').trim(),
      categoria: String(value['categoria'] ?? '').trim(),
      cantidad: Number(value['cantidad'] ?? 0),
      estado: String(value['estado'] ?? '').trim(),
      bodegaEn: optional('bodegaEn'),
      localizador: optional('localizador'),
      fechaIngresoAInventario: optional('fechaIngresoAInventario'),
      notas: optional('notas'),
    };
  }
}
