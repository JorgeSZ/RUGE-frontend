import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TimeoutError, finalize, forkJoin, timeout } from 'rxjs';
import { EventInventoryItem, EventInventoryItemInput, EventInventoryOption } from '../../core/models/inventory.model';
import { EventContextService } from '../../core/services/event-context.service';
import { InventoryService } from '../../core/services/inventory.service';

@Component({
  selector: 'app-event-inventory',
  templateUrl: './event-inventory.component.html',
  styleUrls: ['./event-inventory.component.css'],
  standalone: false
})
export class EventInventoryComponent implements OnInit {
  items: EventInventoryItem[] = [];
  inventory: EventInventoryOption[] = [];
  loading = false;
  loadError = false;
  showForm = false;
  saving = false;
  inventorySearch = '';
  form: FormGroup;
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private fb: FormBuilder,
    public eventCtx: EventContextService,
    private inventoryService: InventoryService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      inventoryItemId: ['', Validators.required],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      fechaSalida: [this.today(), Validators.required],
      fechaDeUso: [''],
      quienRetira: ['', [Validators.required, Validators.maxLength(200)]],
      personaResponsable: [''],
      notas: [''],
    });
  }

  ngOnInit(): void { this.load(); }

  get eventId(): string | null { return this.eventCtx.activeEvent?.id ?? null; }

  get availableItems(): EventInventoryOption[] {
    return this.inventory.filter(item => item.cantidadDisponible > 0);
  }

  get filteredAvailableItems(): EventInventoryOption[] {
    const term = this.inventorySearch.trim().toLocaleLowerCase();
    return this.availableItems
      .filter(item => !term || `${item.articulo} ${item.categoria}`.toLocaleLowerCase().includes(term))
      .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.articulo.localeCompare(b.articulo));
  }

  get pendingReturns(): number {
    return this.items.filter(item => !item.fechaDevolucion).length;
  }

  get selectedItem(): EventInventoryOption | undefined {
    const id = this.form.get('inventoryItemId')?.value;
    return this.inventory.find(item => item.id === id);
  }

  load(): void {
    const eventId = this.eventId;
    if (!eventId) { this.loadError = true; return; }
    this.loading = true;
    this.loadError = false;
    forkJoin({
      inventory: this.inventoryService.getAvailableEventItems(),
      eventItems: this.inventoryService.getEventItems(eventId),
    }).subscribe({
      next: result => {
        this.inventory = result.inventory;
        this.items = result.eventItems;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.loadError = true; this.cdr.detectChanges(); }
    });
  }

  openCreate(): void {
    this.form.reset({ inventoryItemId: '', cantidad: 1, fechaSalida: this.today(), fechaDeUso: '', quienRetira: '', personaResponsable: '', notas: '' });
    this.inventorySearch = '';
    this.showForm = true;
  }

  cancel(): void { this.showForm = false; }

  onInventorySearch(event: Event): void {
    this.inventorySearch = (event.target as HTMLInputElement).value;
  }

  selectItem(item: EventInventoryOption): void {
    const control = this.form.get('inventoryItemId');
    control?.setValue(item.id);
    control?.markAsTouched();
  }

  submit(): void {
    if (this.form.invalid || this.saving || !this.eventId) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    const item = this.inventory.find(candidate => candidate.id === value.inventoryItemId);
    const cantidad = Number(value.cantidad);
    if (!item || cantidad > item.cantidadDisponible) {
      this.showToast('La cantidad supera el stock disponible.', 'error');
      return;
    }
    const request: EventInventoryItemInput = {
      inventoryItemId: value.inventoryItemId,
      cantidad,
      fechaSalida: value.fechaSalida,
      fechaDeUso: value.fechaDeUso || null,
      quienRetira: String(value.quienRetira).trim(),
      personaResponsable: value.personaResponsable ? String(value.personaResponsable).trim() : null,
      notas: value.notas ? String(value.notas).trim() : null,
    };
    this.saving = true;
    this.inventoryService.addToEvent(this.eventId, request).pipe(
      timeout({ first: 30000 }),
      finalize(() => {
        this.saving = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => {
        this.showForm = false;
        this.load();
        this.showToast('Salida registrada y stock actualizado.', 'success');
      },
      error: error => {
        const message = error instanceof TimeoutError
          ? 'El servidor no confirmó el registro en 30 segundos. Actualiza el inventario antes de volver a intentarlo.'
          : 'No se pudo registrar la salida. Actualiza el stock disponible.';
        this.showToast(message, 'error');
      }
    });
  }

  markReturned(item: EventInventoryItem): void {
    if (!this.eventId || !confirm(`¿Marcar ${item.articulo} como devuelto?`)) return;
    this.inventoryService.markReturned(this.eventId, item.id, this.today()).subscribe({
      next: () => { this.load(); this.showToast('Devolución registrada y stock liberado.', 'success'); },
      error: () => this.showToast('No se pudo registrar la devolución.', 'error')
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

  private today(): string {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }
}
