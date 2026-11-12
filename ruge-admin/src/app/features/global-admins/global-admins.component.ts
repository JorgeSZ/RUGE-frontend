import { inject, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { finalize } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { DialogService } from '../../core/services/dialog.service';
import { initials, searchText } from '../global-management/global-management.utils';

interface GlobalAdminRow {
  id: string; username: string; nombre: string; email: string | null; activo: boolean;
}

@Component({
  selector: 'app-global-admins',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './global-admins.component.html',
  styleUrls: ['../global-management/global-management.css', './global-admins.component.css']
})
export class GlobalAdminsComponent implements OnInit {
  private readonly dialogs = inject(DialogService);
  globalAdmins: GlobalAdminRow[] = [];
  showGlobalAdminForm = false;
  editingGlobalAdmin: GlobalAdminRow | null = null;
  loadingGlobalAdmins = false;
  savingGlobalAdmin = false;
  savingGlobalAdminEdit = false;
  globalAdminActionId = '';
  error = ''; success = ''; globalAdminError = ''; globalAdminEditError = '';
  search = ''; status = 'all'; page = 1; readonly pageSize = 10;
  readonly initials = initials;
  readonly globalAdminForm: FormGroup;
  readonly globalAdminEditForm: FormGroup;

  constructor(private http: HttpClient, private fb: FormBuilder, public auth: AuthService, private cdr: ChangeDetectorRef) {
    this.globalAdminForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      username: ['', [Validators.required, Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    });
    this.globalAdminEditForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    });
  }
  ngOnInit(): void { this.loadGlobalAdmins(); }
  get activeCount(): number { return this.globalAdmins.filter(a => a.activo).length; }
  get filteredAdmins(): GlobalAdminRow[] {
    const words = searchText(this.search).split(' ').filter(Boolean);
    return this.globalAdmins.filter(a => (this.status === 'all' || a.activo === (this.status === 'active')) &&
      words.every(w => searchText(`${a.nombre} ${a.username} ${a.email ?? ''}`).includes(w)));
  }
  get pageCount(): number { return Math.max(1, Math.ceil(this.filteredAdmins.length / this.pageSize)); }
  get visibleAdmins(): GlobalAdminRow[] { return this.filteredAdmins.slice((this.page - 1) * this.pageSize, this.page * this.pageSize); }
  resetFilters(): void { this.search = ''; this.status = 'all'; this.page = 1; }
  loadGlobalAdmins(): void {
    this.loadingGlobalAdmins = true;
    this.error = '';
    this.http.get<GlobalAdminRow[]>(`${environment.apiUrl}/global-admins`).pipe(
      finalize(() => { this.loadingGlobalAdmins = false; this.cdr.detectChanges(); })
    ).subscribe({
      next: rows => { this.globalAdmins = [...rows].sort((a, b) => Number(b.activo) - Number(a.activo) || a.nombre.localeCompare(b.nombre, 'es')); this.page = Math.min(this.page, this.pageCount); },
      error: err => { this.error = err?.error?.error ?? 'No se pudieron cargar los administradores globales.'; }
    });
  }

  openGlobalAdminForm(): void {
    this.globalAdminError = '';
    this.globalAdminForm.reset();
    this.showGlobalAdminForm = true;
  }

  closeGlobalAdminForm(): void {
    if (this.savingGlobalAdmin) return;
    this.showGlobalAdminForm = false;
    this.globalAdminForm.reset();
    this.globalAdminError = '';
  }

  openGlobalAdminEdit(admin: GlobalAdminRow): void {
    this.globalAdminEditError = '';
    this.editingGlobalAdmin = admin;
    this.globalAdminEditForm.reset({ name: admin.nombre, email: admin.email ?? '' });
  }

  closeGlobalAdminEdit(): void {
    if (this.savingGlobalAdminEdit) return;
    this.editingGlobalAdmin = null;
    this.globalAdminEditForm.reset();
    this.globalAdminEditError = '';
  }

  saveGlobalAdminEdit(): void {
    if (!this.editingGlobalAdmin || this.globalAdminEditForm.invalid || this.savingGlobalAdminEdit) {
      this.globalAdminEditForm.markAllAsTouched();
      return;
    }

    const admin = this.editingGlobalAdmin;
    this.savingGlobalAdminEdit = true;
    this.globalAdminEditError = '';
    this.http.put(`${environment.apiUrl}/global-admins/${admin.id}`, this.globalAdminEditForm.getRawValue()).pipe(
      finalize(() => { this.savingGlobalAdminEdit = false; this.cdr.detectChanges(); })
    ).subscribe({
      next: () => {
        this.editingGlobalAdmin = null;
        this.globalAdminEditForm.reset();
        this.success = `Se actualizó la información de ${admin.nombre}.`;
        this.loadGlobalAdmins();
      },
      error: err => { this.globalAdminEditError = err?.error?.error ?? 'No se pudo editar el administrador global.'; }
    });
  }

  async resetGlobalAdminPassword(admin: GlobalAdminRow): Promise<void> {
    if (this.globalAdminActionId || !admin.activo || !(await this.dialogs.confirm(`¿Enviar una contraseña temporal nueva a ${admin.email}?`, { title: 'Restablecer contraseña', confirmText: 'Enviar contraseña', destructive: false }))) return;
    this.cdr.markForCheck();
    this.globalAdminActionId = admin.id;
    this.http.post(`${environment.apiUrl}/global-admins/${admin.id}/reset-password`, {}).pipe(
      finalize(() => { this.globalAdminActionId = ''; this.cdr.detectChanges(); })
    ).subscribe({
      next: () => { this.success = `Se envió una contraseña temporal a ${admin.email}.`; },
      error: err => { this.error = err?.error?.error ?? 'No se pudo restablecer la contraseña.'; }
    });
  }

  async deactivateGlobalAdmin(admin: GlobalAdminRow): Promise<void> {
    if (this.globalAdminActionId || admin.id === this.auth.currentUser?.id || !admin.activo || !this.canDeactivateGlobalAdmin(admin)) return;
    if (!(await this.dialogs.confirm(`¿Eliminar a ${admin.nombre}? Su cuenta quedará inactiva y se conservará el historial.`, { title: 'Eliminar registro', confirmText: 'Eliminar', destructive: true }))) return;
    this.cdr.markForCheck();
    this.globalAdminActionId = admin.id;
    this.http.delete(`${environment.apiUrl}/global-admins/${admin.id}`).pipe(
      finalize(() => { this.globalAdminActionId = ''; this.cdr.detectChanges(); })
    ).subscribe({
      next: () => { this.success = `La cuenta de ${admin.nombre} quedó inactiva.`; this.loadGlobalAdmins(); },
      error: err => { this.error = err?.error?.error ?? 'No se pudo eliminar el administrador global.'; }
    });
  }

  canDeactivateGlobalAdmin(admin: GlobalAdminRow): boolean {
    return !admin.activo || this.globalAdmins.filter(item => item.activo).length > 1;
  }

  createGlobalAdmin(): void {
    if (this.globalAdminForm.invalid || this.savingGlobalAdmin) {
      this.globalAdminForm.markAllAsTouched();
      return;
    }

    this.savingGlobalAdmin = true;
    this.globalAdminError = '';
    this.success = '';
    this.http.post(`${environment.apiUrl}/global-admins`, this.globalAdminForm.getRawValue()).pipe(
      finalize(() => { this.savingGlobalAdmin = false; this.cdr.detectChanges(); })
    ).subscribe({
      next: () => {
        this.showGlobalAdminForm = false;
        this.globalAdminForm.reset();
        this.success = 'Administrador global creado.';
        this.loadGlobalAdmins();
      },
      error: err => { this.globalAdminError = err?.error?.error ?? 'No se pudo crear el administrador global.'; }
    });
  }

}
