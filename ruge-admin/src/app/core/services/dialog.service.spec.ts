import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { DialogService, SWEET_ALERT_LOADER } from './dialog.service';

const swal = {
  fire: vi.fn(), isLoading: vi.fn(() => false), showValidationMessage: vi.fn(),
  stopTimer: vi.fn(), resumeTimer: vi.fn()
};

describe('DialogService', () => {
  let service: DialogService;
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [{ provide: SWEET_ALERT_LOADER, useValue: () => Promise.resolve(swal) }]
    });
    service = TestBed.inject(DialogService);
  });

  it('cancelling a destructive dialog never executes the action', async () => {
    swal.fire.mockResolvedValue({ isConfirmed: false });
    const action = vi.fn();
    expect(await service.confirmAction('Eliminar', action, { destructive: true })).toBe(false);
    expect(action).not.toHaveBeenCalled();
    expect(swal.fire).toHaveBeenCalledWith(expect.objectContaining({
      cancelButtonText: 'Cancelar', focusCancel: true, showLoaderOnConfirm: true,
      customClass: expect.objectContaining({ confirmButton: 'ruge-dialog-button ruge-dialog-danger' })
    }));
  });

  it('keeps the operation in the dialog until the confirmed request finishes', async () => {
    let finish!: () => void;
    const pending = new Promise<void>(resolve => { finish = resolve; });
    const action = vi.fn(() => pending);
    swal.fire.mockImplementation(async options => {
      await options.preConfirm();
      return { isConfirmed: true };
    });
    const result = service.confirmAction('Eliminar', action);
    await vi.waitFor(() => expect(action).toHaveBeenCalledOnce());
    finish();
    expect(await result).toBe(true);
  });

  it('shows escaped API errors and keeps a failed action unconfirmed', async () => {
    swal.fire.mockImplementation(async options => {
      expect(await options.preConfirm()).toBe(false);
      return { isConfirmed: false };
    });
    await service.confirmAction('Eliminar', () => Promise.reject({ error: { error: '<img src=x onerror=alert(1)>' } }));
    expect(swal.showValidationMessage.mock.calls[0][0]).toContain('&lt;img');
    expect(swal.showValidationMessage.mock.calls[0][0]).not.toContain('<img');
  });

  it('does not replace an open confirmation with a success notification', async () => {
    let close!: (value: unknown) => void;
    swal.fire.mockImplementationOnce(() => new Promise(resolve => { close = resolve; }));
    const confirm = service.confirm('Continuar');
    await vi.waitFor(() => expect(swal.fire).toHaveBeenCalledOnce());
    const notification = service.success('Guardado');
    expect(await service.confirm('Segundo intento')).toBe(false);
    expect(swal.fire).toHaveBeenCalledOnce();
    swal.fire.mockResolvedValue({ isConfirmed: false });
    close({ isConfirmed: false });
    await confirm;
    await notification;
    expect(swal.fire).toHaveBeenCalledTimes(2);
    expect(swal.fire.mock.calls[1][0]).toMatchObject({ toast: true, timer: 4000, titleText: 'Guardado' });
  });

  it('uses text for names and messages instead of interpreting HTML', async () => {
    swal.fire.mockResolvedValue({ isConfirmed: true });
    await service.confirm('<b>Nombre de enseñanza</b>');
    expect(swal.fire.mock.calls[0][0].text).toBe('<b>Nombre de enseñanza</b>');
    expect(swal.fire.mock.calls[0][0].html).toBeUndefined();
  });

  it('errors require acknowledgement and have no automatic closing timer', async () => {
    swal.fire.mockResolvedValue({ isConfirmed: true });
    await service.error('No se pudo guardar.');
    expect(swal.fire.mock.calls[0][0]).toMatchObject({ icon: 'error', confirmButtonText: 'Entendido' });
    expect(swal.fire.mock.calls[0][0].timer).toBeUndefined();
  });
});
