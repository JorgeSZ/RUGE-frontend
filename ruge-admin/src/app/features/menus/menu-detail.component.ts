import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuService } from '../../core/services/menu.service';
import { ProvisionService } from '../../core/services/provision.service';
import { EventContextService } from '../../core/services/event-context.service';
import { Menu, MenuIngrediente } from '../../core/models/menu.model';
import { UNIDADES_MEDIDA as UNIDADES } from '../../core/models/provision.model';

@Component({
  selector: 'app-menu-detail',
  templateUrl: './menu-detail.component.html',
  styleUrls: ['./menu-detail.component.css'],
  standalone: false
})
export class MenuDetailComponent implements OnInit {
  menu: Menu | null = null;
  loading = false;
  showForm = false;
  editingIngId: string | null = null;
  form: FormGroup;
  unidades = UNIDADES;
  totalPersonasEvento = 0;
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private menuService: MenuService,
    private provisionService: ProvisionService,
    public eventCtx: EventContextService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      nombre: ['', [Validators.required]],
      cantidadPorPersona: [1, [Validators.required, Validators.min(0.0001)]],
      unidad: ['Unidades', Validators.required],
      modoPersonas: ['Auto', Validators.required],
      cantidadPersonasManual: [null],
    });

    this.form.get('modoPersonas')?.valueChanges.subscribe(mode => {
      const ctrl = this.form.get('cantidadPersonasManual');
      if (mode === 'Manual' || mode === 'Fixed')
        ctrl?.setValidators([Validators.required, Validators.min(0.0001)]);
      else ctrl?.clearValidators();
      ctrl?.updateValueAndValidity();
    });
  }

  ngOnInit(): void {
    this.load();
    this.loadTotalPersonas();
  }

  get menuId(): string { return this.route.snapshot.paramMap.get('menuId') ?? ''; }

  get modo(): string { return this.form.get('modoPersonas')?.value ?? 'Auto'; }
  get isManual(): boolean { return this.modo === 'Manual'; }
  get isFixed(): boolean  { return this.modo === 'Fixed'; }

  get previewLabel(): string {
    const qty   = this.form.get('cantidadPorPersona')?.value ?? 0;
    const unidad = this.form.get('unidad')?.value ?? '';
    const manual = this.form.get('cantidadPersonasManual')?.value ?? 0;
    if (this.isFixed) return `Total fijo: ${manual} ${unidad}`;
    const personas = this.isManual ? manual : this.totalPersonasEvento;
    return `${qty} ${unidad} × ${personas} personas = ${+(qty * personas).toFixed(4)} ${unidad}`;
  }

  calcTotal(ing: MenuIngrediente): string {
    if (ing.modoPersonas === 'Fixed') {
      const val = ing.cantidadPersonasManual;
      return val != null ? val.toFixed(2) + ' ' + ing.unidad : '— editar para completar';
    }
    const personas = ing.modoPersonas === 'Auto'
      ? this.totalPersonasEvento
      : (ing.cantidadPersonasManual ?? 0);
    return (ing.cantidadPorPersona * personas).toFixed(2) + ' ' + ing.unidad;
  }

  personasLabel(ing: MenuIngrediente): string {
    if (ing.modoPersonas === 'Fixed')  return ing.cantidadPersonasManual != null ? '(total fijo)' : '—';
    if (ing.modoPersonas === 'Auto')   return `${this.totalPersonasEvento} (evento)`;
    return String(ing.cantidadPersonasManual ?? '—');
  }

  load(): void {
    this.loading = true;
    this.menuService.getById(this.menuId).subscribe({
      next: m => { this.menu = m; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.router.navigate(['/menus']); }
    });
  }

  private loadTotalPersonas(): void {
    const eventId = this.eventCtx.activeEvent?.id;
    if (!eventId) return;
    this.provisionService.getReport(eventId).subscribe({
      next: r => { this.totalPersonasEvento = r.totalPersonas; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  back(): void { this.router.navigate(['/menus']); }

  openCreate(): void {
    this.editingIngId = null;
    this.form.reset({ nombre: '', cantidadPorPersona: 1, unidad: 'Unidades', modoPersonas: 'Auto', cantidadPersonasManual: null });
    this.showForm = true;
  }

  openEdit(ing: MenuIngrediente): void {
    this.editingIngId = ing.id;
    this.form.patchValue({
      nombre: ing.nombre,
      cantidadPorPersona: ing.cantidadPorPersona,
      unidad: ing.unidad,
      modoPersonas: ing.modoPersonas,
      cantidadPersonasManual: ing.cantidadPersonasManual ?? null,
    });
    this.showForm = true;
  }

  cancel(): void { this.showForm = false; this.editingIngId = null; }

  submit(): void {
    if (this.form.invalid || !this.menu) return;
    const val = { ...this.form.value };
    if (val.modoPersonas === 'Auto') val.cantidadPersonasManual = null;

    if (this.editingIngId) {
      this.menuService.updateIngrediente(this.menu.id, this.editingIngId, val).subscribe({
        next: () => { this.showForm = false; this.load(); this.showToast('Ingrediente actualizado.', 'success'); },
        error: () => this.showToast('Error al actualizar.', 'error')
      });
    } else {
      this.menuService.addIngrediente(this.menu.id, val).subscribe({
        next: () => { this.showForm = false; this.load(); this.showToast('Ingrediente agregado.', 'success'); },
        error: () => this.showToast('Error al agregar.', 'error')
      });
    }
  }

  delete(ing: MenuIngrediente): void {
    if (!this.menu || !confirm(`¿Eliminar "${ing.nombre}"?`)) return;
    this.menuService.deleteIngrediente(this.menu.id, ing.id).subscribe({
      next: () => { this.load(); this.showToast('Ingrediente eliminado.', 'success'); },
      error: () => this.showToast('Error al eliminar.', 'error')
    });
  }

  moveUp(ing: MenuIngrediente, index: number): void {
    if (!this.menu || index === 0) return;
    const prev = this.menu.ingredientes[index - 1];
    this.menuService.reorderIngrediente(this.menu.id, ing.id, prev.orden).subscribe(() => {
      this.menuService.reorderIngrediente(this.menu!.id, prev.id, ing.orden).subscribe(() => this.load());
    });
  }

  moveDown(ing: MenuIngrediente, index: number): void {
    if (!this.menu || index === this.menu.ingredientes.length - 1) return;
    const next = this.menu.ingredientes[index + 1];
    this.menuService.reorderIngrediente(this.menu.id, ing.id, next.orden).subscribe(() => {
      this.menuService.reorderIngrediente(this.menu!.id, next.id, ing.orden).subscribe(() => this.load());
    });
  }

  showToast(message: string, type: 'success' | 'error'): void {
    clearTimeout(this.toastTimer);
    this.toast = { message, type };
    this.cdr.detectChanges();
    this.toastTimer = setTimeout(() => { this.toast = null; this.cdr.detectChanges(); }, 3500);
  }
}
