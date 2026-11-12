import { ChangeDetectorRef, Component, DestroyRef, HostListener, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { DialogService } from '../../core/services/dialog.service';
import { UserManagementService } from '../../core/services/user-management.service';
import { AuthService } from '../../core/services/auth.service';
import { UserDto } from '../../core/models/auth.model';
import { initials, searchText } from '../global-management/global-management.utils';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['../global-management/global-management.css', './users.component.css'],
  standalone: false,
})
export class UsersComponent implements OnInit {
  private readonly dialogs = inject(DialogService);
  private readonly destroyRef = inject(DestroyRef);
  readonly initials = initials;
  users: UserDto[] = [];
  filteredUsers: UserDto[] = [];
  visibleUsers: UserDto[] = [];
  roleFilters: { role: string; count: number }[] = [];
  loading = false;
  loadError = '';
  formError = '';
  showForm = false;
  editTarget: UserDto | null = null;
  form: FormGroup;
  saving = false;
  actionId: string | null = null;
  toast: { message: string; type: 'success' | 'error' } | null = null;
  search = '';
  status = 'all';
  selectedRole = '';
  page = 1;
  pageSize = 10;
  private returnFocus: HTMLElement | null = null;

  readonly roles = [
    'Admin',
    'Coordinador',
    'Logistica',
    'Eventos',
    'Tiempos',
    'TiemposServidor',
    'Cocina',
    'Calaquero',
    'Guia',
    'Inventario',
    'Registrador',
  ];
  get currentUserId(): string {
    return this.auth.currentUser?.id ?? '';
  }
  get activeCount(): number {
    return this.users.filter((u) => u.activo).length;
  }
  get pageCount(): number {
    return Math.max(1, Math.ceil(this.filteredUsers.length / this.pageSize));
  }
  get firstResult(): number {
    return this.filteredUsers.length ? (this.page - 1) * this.pageSize + 1 : 0;
  }
  get lastResult(): number {
    return Math.min(this.page * this.pageSize, this.filteredUsers.length);
  }

  constructor(
    private userSvc: UserManagementService,
    private auth: AuthService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.email, Validators.maxLength(254)]],
      username: [''],
      rol: ['Coordinador', Validators.required],
      activo: [true],
    });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loadError = '';
    this.userSvc
      .getAll()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (users) => {
          this.users = [...users].sort(
            (a, b) =>
              Number(b.activo) - Number(a.activo) ||
              a.rol.localeCompare(b.rol, 'es') ||
              a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }) ||
              a.username.localeCompare(b.username, 'es'),
          );
          const counts = new Map<string, number>();
          this.users.forEach((u) => counts.set(u.rol, (counts.get(u.rol) ?? 0) + 1));
          this.roleFilters = [...counts]
            .sort(([a], [b]) => a.localeCompare(b, 'es'))
            .map(([role, count]) => ({ role, count }));
          this.applyFilters(false);
        },
        error: () => {
          this.loadError = 'No se pudieron cargar los usuarios. Intenta de nuevo.';
        },
      });
  }

  applyFilters(resetPage = true): void {
    if (resetPage) this.page = 1;
    const terms = searchText(this.search).split(/\s+/).filter(Boolean);
    this.filteredUsers = this.users.filter((u) => {
      const text = searchText(`${u.nombre} ${u.username} @${u.username} ${u.email ?? ''}`);
      return (
        terms.every((term) => text.includes(term)) &&
        (!this.selectedRole || u.rol === this.selectedRole) &&
        (this.status === 'all' || (this.status === 'active' ? u.activo : !u.activo))
      );
    });
    this.page = Math.max(1, Math.min(this.page, this.pageCount));
    this.visibleUsers = this.filteredUsers.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }

  setRole(role: string): void {
    this.selectedRole = role;
    this.applyFilters();
  }
  setPage(page: number): void {
    this.page = page;
    this.applyFilters(false);
  }
  resetFilters(): void {
    this.search = '';
    this.status = 'all';
    this.selectedRole = '';
    this.applyFilters();
  }
  trackUser(_index: number, user: UserDto): string {
    return user.id;
  }

  openCreate(): void {
    if (this.saving || this.actionId) return;
    this.editTarget = null;
    this.form.reset({ rol: 'Coordinador', activo: true, email: '', nombre: '', username: '' });
    this.form.get('username')!.setValidators([Validators.required, Validators.maxLength(50)]);
    this.form.get('email')!.setValidators([Validators.required, Validators.email, Validators.maxLength(254)]);
    this.openForm();
  }

  openEdit(user: UserDto): void {
    if (user.id === this.currentUserId || this.saving || this.actionId) return;
    this.editTarget = user;
    this.form.get('username')!.clearValidators();
    this.form.get('email')!.setValidators([Validators.email, Validators.maxLength(254)]);
    this.form.reset({
      nombre: user.nombre,
      username: user.username,
      email: user.email ?? '',
      rol: user.rol,
      activo: user.activo,
    });
    this.openForm();
  }

  private openForm(): void {
    this.form.get('username')!.updateValueAndValidity();
    this.form.get('email')!.updateValueAndValidity();
    this.formError = '';
    this.returnFocus = document.activeElement as HTMLElement;
    this.showForm = true;
    setTimeout(() => document.querySelector<HTMLInputElement>('#user-name')?.focus());
  }

  @HostListener('document:keydown.escape')
  closeForm(): void {
    if (!this.showForm || this.saving) return;
    this.showForm = false;
    this.returnFocus?.focus();
  }

  trapFocus(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const elements = Array.from(
      (event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled)',
      ),
    );
    const first = elements[0],
      last = elements[elements.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  save(): void {
    if (this.form.invalid || this.saving || this.editTarget?.id === this.currentUserId) return;
    this.saving = true;
    this.formError = '';
    const v = this.form.value;
    const isEdit = !!this.editTarget;
    const obs = this.editTarget
      ? this.userSvc.update(this.editTarget.id, {
          nombre: v.nombre,
          email: v.email,
          rol: v.rol,
          activo: v.activo,
        })
      : this.userSvc.create({ nombre: v.nombre, username: v.username, email: v.email, rol: v.rol });
    obs
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.showForm = false;
          this.returnFocus?.focus();
          this.load();
          this.showToast(
            isEdit ? 'Usuario actualizado.' : 'Usuario creado. Se enviaron las credenciales a su correo.',
            'success',
          );
        },
        error: (err) => {
          this.formError = err?.error?.error ?? 'No se pudo guardar el usuario. Intenta de nuevo.';
        },
      });
  }

  async resetPassword(user: UserDto): Promise<void> {
    if (this.actionId || this.saving || user.id === this.currentUserId) return;
    if (!user.email) {
      this.showToast('Agrega primero un correo al usuario para enviarle la contraseña temporal.', 'error');
      return;
    }
    this.actionId = user.id;
    const confirmed = await this.dialogs.confirm(`¿Enviar una nueva contraseña temporal a ${user.email}?`, {
      title: 'Restablecer contraseña',
      confirmText: 'Enviar contraseña',
      destructive: false,
    });
    if (!confirmed) {
      this.actionId = null;
      this.cdr.markForCheck();
      return;
    }
    this.cdr.markForCheck();
    this.userSvc
      .resetPassword(user.id)
      .pipe(
        finalize(() => {
          this.actionId = null;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.load();
          this.showToast('Se envió una contraseña temporal por correo.', 'success');
        },
        error: (err) => this.showToast(err?.error?.error ?? 'No se pudo restablecer la contraseña.', 'error'),
      });
  }

  async deactivate(user: UserDto): Promise<void> {
    if (this.actionId || this.saving || !user.activo || user.id === this.currentUserId) return;
    this.actionId = user.id;
    const confirmed = await this.dialogs.confirm(`¿Desactivar a "${user.nombre}"?`, {
      title: 'Desactivar usuario',
      confirmText: 'Desactivar',
      destructive: true,
    });
    if (!confirmed) {
      this.actionId = null;
      this.cdr.markForCheck();
      return;
    }
    this.cdr.markForCheck();
    this.userSvc
      .deactivate(user.id)
      .pipe(
        finalize(() => {
          this.actionId = null;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.load();
          this.showToast('Usuario desactivado.', 'success');
        },
        error: (err) => this.showToast(err?.error?.error ?? 'No se pudo desactivar el usuario.', 'error'),
      });
  }

  roleBadgeClass(rol: string): string {
    if (rol === 'Admin' || rol === 'Coordinador') return 'badge-admin';
    if (rol === 'Logistica') return 'badge-logistica';
    if (rol === 'Tiempos' || rol === 'TiemposServidor') return 'badge-tiempos';
    if (rol === 'Cocina') return 'badge-cocina';
    if (rol === 'Calaquero') return 'badge-calaquero';
    if (rol === 'Inventario') return 'badge-inventario';
    return 'badge-eventos';
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast = { message, type };
    this.cdr.markForCheck();
  }
}
