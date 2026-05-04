import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MenuService } from '../../core/services/menu.service';
import { Menu } from '../../core/models/menu.model';

@Component({
  selector: 'app-menus',
  templateUrl: './menus.component.html',
  styleUrls: ['./menus.component.css'],
  standalone: false
})
export class MenusComponent implements OnInit {
  menus: Menu[] = [];
  loading = false;
  showForm = false;
  editingId: string | null = null;
  form: FormGroup;
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any;

  constructor(
    private fb: FormBuilder,
    private menuService: MenuService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(1)]],
      descripcion: [''],
    });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.menuService.getAll().subscribe({
      next: m => { this.menus = m; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  openCreate(): void {
    this.editingId = null;
    this.form.reset({ nombre: '', descripcion: '' });
    this.showForm = true;
  }

  openEdit(menu: Menu, e: MouseEvent): void {
    e.stopPropagation();
    this.editingId = menu.id;
    this.form.patchValue({ nombre: menu.nombre, descripcion: menu.descripcion ?? '' });
    this.showForm = true;
  }

  cancel(): void { this.showForm = false; this.editingId = null; }

  submit(): void {
    if (this.form.invalid) return;
    const val = this.form.value;
    if (this.editingId) {
      this.menuService.update(this.editingId, val).subscribe({
        next: () => { this.showForm = false; this.load(); this.showToast('Menú actualizado.', 'success'); },
        error: () => this.showToast('Error al actualizar.', 'error')
      });
    } else {
      this.menuService.create(val).subscribe({
        next: () => { this.showForm = false; this.load(); this.showToast('Menú creado.', 'success'); },
        error: () => this.showToast('Error al crear.', 'error')
      });
    }
  }

  delete(menu: Menu, e: MouseEvent): void {
    e.stopPropagation();
    if (!confirm(`¿Eliminar "${menu.nombre}" y todos sus ingredientes?`)) return;
    this.menuService.delete(menu.id).subscribe({
      next: () => { this.load(); this.showToast('Menú eliminado.', 'success'); },
      error: () => this.showToast('Error al eliminar.', 'error')
    });
  }

  goToDetail(menu: Menu): void {
    this.router.navigate(['/menus', menu.id]);
  }

  moveUp(menu: Menu, index: number): void {
    if (index === 0) return;
    const prev = this.menus[index - 1];
    this.menuService.reorder(menu.id, prev.orden).subscribe(() => {
      this.menuService.reorder(prev.id, menu.orden).subscribe(() => this.load());
    });
  }

  moveDown(menu: Menu, index: number): void {
    if (index === this.menus.length - 1) return;
    const next = this.menus[index + 1];
    this.menuService.reorder(menu.id, next.orden).subscribe(() => {
      this.menuService.reorder(next.id, menu.orden).subscribe(() => this.load());
    });
  }

  showToast(message: string, type: 'success' | 'error'): void {
    clearTimeout(this.toastTimer);
    this.toast = { message, type };
    this.cdr.detectChanges();
    this.toastTimer = setTimeout(() => { this.toast = null; this.cdr.detectChanges(); }, 3500);
  }
}
