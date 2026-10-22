import { ChangeDetectorRef, Component } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthUser } from '../../core/models/auth.model';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  standalone: false
})
export class ProfileComponent {
  user: AuthUser | null;
  readonly nameForm: FormGroup;
  readonly passwordForm: FormGroup;
  savingName = false;
  savingPassword = false;
  nameFeedback: { message: string; type: 'success' | 'error' } | null = null;
  passwordFeedback: { message: string; type: 'success' | 'error' } | null = null;

  constructor(
    private auth: AuthService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.user = this.auth.currentUser;
    this.nameForm = this.fb.group({
      nombre: [this.user?.nombre ?? '', [Validators.required, Validators.maxLength(100)]],
    });
    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/(?=.*[A-Z])(?=.*\d)/),
      ]],
      confirmPassword: ['', Validators.required],
    }, { validators: this.passwordsMatch });
  }

  saveName(): void {
    if (this.nameForm.invalid || this.savingName) {
      this.nameForm.markAllAsTouched();
      return;
    }

    const nombre = String(this.nameForm.controls['nombre'].value ?? '').trim();
    if (!nombre) {
      this.nameForm.controls['nombre'].setErrors({ required: true });
      return;
    }

    this.nameFeedback = null;
    this.savingName = true;
    this.auth.updateProfile(nombre).pipe(
      finalize(() => {
        this.savingName = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: user => {
        this.user = user;
        this.nameForm.patchValue({ nombre: user.nombre });
        this.nameFeedback = { message: 'Tu nombre se actualizó.', type: 'success' };
      },
      error: error => {
        this.nameFeedback = {
          message: error?.error?.error ?? 'No se pudo actualizar el nombre.',
          type: 'error',
        };
      }
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid || this.savingPassword) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.passwordFeedback = null;
    this.savingPassword = true;
    this.auth.changePassword(currentPassword ?? '', newPassword ?? '').pipe(
      finalize(() => {
        this.savingPassword = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: response => {
        this.passwordForm.reset();
        this.passwordFeedback = { message: response.message || 'Tu contraseña se actualizó.', type: 'success' };
      },
      error: error => {
        this.passwordFeedback = {
          message: error?.error?.error ?? 'No se pudo actualizar la contraseña.',
          type: 'error',
        };
      }
    });
  }

  private passwordsMatch(control: AbstractControl) {
    const newPassword = control.get('newPassword')?.value;
    const confirmation = control.get('confirmPassword')?.value;
    return !confirmation || newPassword === confirmation ? null : { passwordMismatch: true };
  }
}
