import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProvisionService } from '../../core/services/provision.service';
import { EventContextService } from '../../core/services/event-context.service';
import { ProvisionItem, UNIDADES_MEDIDA } from '../../core/models/provision.model';

@Component({
  selector: 'app-provision',
  templateUrl: './provision.component.html',
  styleUrls: ['./provision.component.css'],
  standalone: false
})
export class ProvisionComponent implements OnInit {
  items: ProvisionItem[] = [];
  loading = false;
  showForm = false;
  editingId: string | null = null;
  form: FormGroup;
  unidades = UNIDADES_MEDIDA;
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any;

  constructor(
    private fb: FormBuilder,
    private provisionService: ProvisionService,
    public eventCtx: EventContextService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(1)]],
      cantidadPorPersona: [1, [Validators.required, Validators.min(0.0001)]],
      unidad: ['Unidades', Validators.required],
    });
  }

  ngOnInit(): void { this.load(); }

  get totalPersonas(): number {
    return this.eventCtx.activeEvent ? 0 : 0; // preview placeholder — actual totals from API
  }

  get previewTotal(): number {
    const qty = this.form.get('cantidadPorPersona')?.value ?? 0;
    return qty; // shown as "× N personas"
  }

  load(): void {
    this.loading = true;
    this.provisionService.getAll().subscribe({
      next: items => { this.items = items; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  openCreate(): void {
    this.editingId = null;
    this.form.reset({ nombre: '', cantidadPorPersona: 1, unidad: 'Unidades' });
    this.showForm = true;
  }

  openEdit(item: ProvisionItem): void {
    this.editingId = item.id;
    this.form.patchValue({ nombre: item.nombre, cantidadPorPersona: item.cantidadPorPersona, unidad: item.unidad });
    this.showForm = true;
  }

  cancel(): void { this.showForm = false; this.editingId = null; }

  submit(): void {
    if (this.form.invalid) return;
    const val = this.form.value;
    if (this.editingId) {
      this.provisionService.update(this.editingId, val).subscribe({
        next: () => { this.showForm = false; this.load(); this.showToast('Ítem actualizado.', 'success'); },
        error: () => this.showToast('Error al actualizar.', 'error')
      });
    } else {
      this.provisionService.create(val).subscribe({
        next: () => { this.showForm = false; this.load(); this.showToast('Ítem creado.', 'success'); },
        error: () => this.showToast('Error al crear.', 'error')
      });
    }
  }

  delete(item: ProvisionItem): void {
    if (!confirm(`¿Eliminar "${item.nombre}"?`)) return;
    this.provisionService.delete(item.id).subscribe({
      next: () => { this.load(); this.showToast('Ítem eliminado.', 'success'); },
      error: () => this.showToast('Error al eliminar.', 'error')
    });
  }

  moveUp(item: ProvisionItem, index: number): void {
    if (index === 0) return;
    const prev = this.items[index - 1];
    this.provisionService.reorder(item.id, prev.orden).subscribe(() => {
      this.provisionService.reorder(prev.id, item.orden).subscribe(() => this.load());
    });
  }

  moveDown(item: ProvisionItem, index: number): void {
    if (index === this.items.length - 1) return;
    const next = this.items[index + 1];
    this.provisionService.reorder(item.id, next.orden).subscribe(() => {
      this.provisionService.reorder(next.id, item.orden).subscribe(() => this.load());
    });
  }

  showToast(message: string, type: 'success' | 'error'): void {
    clearTimeout(this.toastTimer);
    this.toast = { message, type };
    this.cdr.detectChanges();
    this.toastTimer = setTimeout(() => { this.toast = null; this.cdr.detectChanges(); }, 3500);
  }
}
