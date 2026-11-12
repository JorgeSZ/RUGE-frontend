import { inject, Injectable, InjectionToken } from '@angular/core';
import type { SweetAlertOptions } from 'sweetalert2';

export interface ConfirmOptions {
  title?: string;
  confirmText?: string;
  destructive?: boolean;
}

export const SWEET_ALERT_LOADER = new InjectionToken<() => Promise<typeof import('sweetalert2').default>>(
  'SWEET_ALERT_LOADER', {
    providedIn: 'root',
    factory: () => () => import('sweetalert2').then(module => module.default)
  }
);

@Injectable({ providedIn: 'root' })
export class DialogService {
  private queue: Promise<unknown> = Promise.resolve();
  private confirming = false;

  // Lazy import keeps the dialog library out of the initial application bundle.
  private readonly library = inject(SWEET_ALERT_LOADER);

  private enqueue<T>(action: () => Promise<T>): Promise<T> {
    const result = this.queue.then(action);
    this.queue = result.catch(() => undefined);
    return result;
  }

  private appearance(destructive = false): SweetAlertOptions {
    return {
      background: '#1C2120', color: '#F0EDE6', heightAuto: false,
      buttonsStyling: false, reverseButtons: true, returnFocus: true,
      customClass: {
        container: 'ruge-dialog-container', popup: 'ruge-dialog', title: 'ruge-dialog-title',
        htmlContainer: 'ruge-dialog-text', actions: 'ruge-dialog-actions',
        confirmButton: destructive ? 'ruge-dialog-button ruge-dialog-danger' : 'ruge-dialog-button ruge-dialog-primary',
        cancelButton: 'ruge-dialog-button ruge-dialog-secondary'
      }
    };
  }

  async confirm(message: string, options: ConfirmOptions = {}): Promise<boolean> {
    return this.confirmAction(message, undefined, options);
  }

  async confirmAction(message: string, action?: () => Promise<unknown>, options: ConfirmOptions = {}): Promise<boolean> {
    if (this.confirming) return false;
    this.confirming = true;
    try {
      return await this.enqueue(async () => {
        const swal = await this.library();
        const result = await swal.fire({
          ...this.appearance(options.destructive),
          titleText: options.title ?? 'Confirmar acción', text: message,
          icon: options.destructive ? 'warning' : 'question', iconColor: '#F0B429',
          showCancelButton: true, cancelButtonText: 'Cancelar',
          confirmButtonText: options.confirmText ?? 'Confirmar', focusCancel: true,
          showLoaderOnConfirm: !!action,
          allowOutsideClick: () => !swal.isLoading(), allowEscapeKey: () => !swal.isLoading(),
          preConfirm: action ? async () => {
            try { await action(); return true; }
            catch (error: unknown) {
              const response = error as { error?: { error?: string } };
              const span = document.createElement('span');
              span.textContent = response?.error?.error || 'No se pudo completar la acción. Inténtalo de nuevo.';
              swal.showValidationMessage(span.outerHTML);
              return false;
            }
          } : undefined
        });
        return result.isConfirmed;
      });
    } catch (error) {
      console.error('No se pudo abrir el diálogo de confirmación.', error);
      return false;
    } finally { this.confirming = false; }
  }

  success(message: string): Promise<void> {
    return this.enqueue(async () => {
      const swal = await this.library();
      await swal.fire({
        ...this.appearance(), titleText: message, icon: 'success',
        toast: true, position: 'top-end', showConfirmButton: false,
        showCloseButton: true, closeButtonAriaLabel: 'Cerrar aviso',
        timer: 4000, timerProgressBar: true,
        didOpen: popup => {
          popup.addEventListener('mouseenter', () => swal.stopTimer());
          popup.addEventListener('mouseleave', () => swal.resumeTimer());
        }
      });
    }).catch(error => { console.error('No se pudo mostrar el aviso.', error); });
  }

  error(message: string): Promise<void> {
    return this.enqueue(async () => {
      const swal = await this.library();
      await swal.fire({
        ...this.appearance(), titleText: 'No se pudo completar la acción', text: message,
        icon: 'error', confirmButtonText: 'Entendido'
      });
    }).catch(error => { console.error('No se pudo mostrar el aviso.', error); });
  }
}
