import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserManagementService } from '../../core/services/user-management.service';
import { AuthService } from '../../core/services/auth.service';
import { UserDto } from '../../core/models/auth.model';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css'],
  standalone: false
})
export class UsersComponent implements OnInit {
  users: UserDto[] = [];
  loading = false;
  showForm = false;
  editTarget: UserDto | null = null;
  form: FormGroup;
  saving = false;
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any;

  readonly roles = ['Admin', 'Logistica', 'Eventos', 'Tiempos', 'Cocina'];

  get currentUserId(): string { return this.auth.currentUser?.id ?? ''; }

  constructor(
    private userSvc: UserManagementService,
    private auth: AuthService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      username: [''],
      password: [''],
      rol: ['Admin', Validators.required],
      activo: [true],
    });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.userSvc.getAll().subscribe({
      next: u => { this.users = u; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  openCreate(): void {
    this.editTarget = null;
    this.form.reset({ rol: 'Admin', activo: true });
    this.form.get('username')!.setValidators([Validators.required, Validators.maxLength(50)]);
    this.form.get('password')!.setValidators([Validators.required, Validators.minLength(8)]);
    this.form.updateValueAndValidity();
    this.showForm = true;
  }

  openEdit(user: UserDto): void {
    this.editTarget = user;
    this.form.get('username')!.clearValidators();
    this.form.get('password')!.clearValidators();
    this.form.updateValueAndValidity();
    this.form.patchValue({ nombre: user.nombre, rol: user.rol, activo: user.activo });
    this.showForm = true;
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const v = this.form.value;

    const obs = this.editTarget
      ? this.userSvc.update(this.editTarget.id, { nombre: v.nombre, rol: v.rol, activo: v.activo })
      : this.userSvc.create({ nombre: v.nombre, username: v.username, password: v.password, rol: v.rol });

    obs.subscribe({
      next: () => { this.saving = false; this.showForm = false; this.load(); this.showToast('Guardado', 'success'); },
      error: (err) => { this.saving = false; this.showToast(err?.error?.error ?? 'Error al guardar', 'error'); }
    });
  }

  resetPassword(user: UserDto): void {
    if (!confirm(`¿Restablecer contraseña de "${user.nombre}" a la predeterminada?`)) return;
    this.userSvc.resetPassword(user.id).subscribe({
      next: () => this.showToast('Contraseña restablecida', 'success'),
      error: (err) => this.showToast(err?.error?.error ?? 'Error', 'error')
    });
  }

  deactivate(user: UserDto): void {
    if (!confirm(`¿Desactivar a "${user.nombre}"?`)) return;
    this.userSvc.deactivate(user.id).subscribe({
      next: () => { this.load(); this.showToast('Usuario desactivado', 'success'); },
      error: (err) => this.showToast(err?.error?.error ?? 'Error', 'error')
    });
  }

  roleBadgeClass(rol: string): string {
    if (rol === 'Admin')     return 'badge-admin';
    if (rol === 'Logistica') return 'badge-logistica';
    if (rol === 'Tiempos')   return 'badge-tiempos';
    if (rol === 'Cocina')    return 'badge-cocina';
    return 'badge-eventos';
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    clearTimeout(this.toastTimer);
    this.toast = { message, type };
    this.cdr.detectChanges();
    this.toastTimer = setTimeout(() => { this.toast = null; this.cdr.detectChanges(); }, 3000);
  }
}
