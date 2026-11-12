import { CommonModule } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRouteSnapshot, provideRouter, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { vi } from 'vitest';
import * as icons from '../../core/icons/lucide-icons';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { ChurchContextService } from '../../core/services/church-context.service';
import { EventContextService } from '../../core/services/event-context.service';
import { DialogService } from '../../core/services/dialog.service';
import { RoleGuard } from '../../core/guards/role.guard';
import { ChurchesComponent } from '../churches/churches.component';
import { GlobalAdminsComponent } from '../global-admins/global-admins.component';

const church = {
  id: 'church-1', name: 'Impact España', isActive: true, createdAt: '2026-01-01',
  administrator: { id: 'admin-1', username: 'fabio', nombre: 'Fabio Fallas', email: 'fabio@example.com' },
  license: { id: 'license-1', type: 'Indefinite', startsAt: '2026-01-01', expiresAt: null, isExpired: false }
};
const admins = [
  { id: 'inactive', nombre: 'Ana Inactiva', username: 'ana', email: 'ana@example.com', activo: false },
  { id: 'self', nombre: 'Jorge Segura', username: 'jorge', email: 'jorge@example.com', activo: true },
  { id: 'other', nombre: 'Fabio Fallas', username: 'fabio', email: 'fabio@example.com', activo: true }
];

describe('Separate global management pages', () => {
  let http: HttpTestingController;
  const auth = { currentUser: { id: 'self', rol: 'GlobalAdmin' }, hasAnyRole: (roles: string[]) => roles.includes(auth.currentUser.rol) };
  const churchContext = { selectedChurchId: null, select: vi.fn(), clear: vi.fn() };
  const eventContext = { initialize: vi.fn().mockResolvedValue(undefined), clear: vi.fn() };
  const dialogs = { confirm: vi.fn().mockResolvedValue(true) };
  const base = environment.apiUrl;

  beforeEach(async () => {
    auth.currentUser.rol = 'GlobalAdmin';
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, ReactiveFormsModule, LucideAngularModule.pick(icons), GlobalAdminsComponent],
      declarations: [ChurchesComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: AuthService, useValue: auth }, { provide: ChurchContextService, useValue: churchContext },
        { provide: EventContextService, useValue: eventContext }, { provide: DialogService, useValue: dialogs }
      ]
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('loads only churches, displays real totals and filters without accents', async () => {
    const f = TestBed.createComponent(ChurchesComponent); f.detectChanges();
    http.expectNone(`${base}/global-admins`);
    http.expectOne(`${base}/churches`).flush([church, { ...church, id: 'inactive', name: 'Otra iglesia', isActive: false }]);
    await f.whenStable();
    expect(f.nativeElement.querySelectorAll('.church-card').length).toBe(2);
    expect(f.nativeElement.querySelector('.metric strong').textContent).toBe('2');
    const search = f.nativeElement.querySelector('input[type=search]'); search.value = 'espana fabio'; search.dispatchEvent(new Event('input')); await f.whenStable();
    expect(f.nativeElement.querySelectorAll('.church-card').length).toBe(1);
    expect(f.nativeElement.textContent).not.toContain('Administradores globales');
    const status = f.nativeElement.querySelector('.filters select'); status.value = 'inactive'; status.dispatchEvent(new Event('change')); await f.whenStable();
    expect(f.nativeElement.querySelector('.empty-state').textContent).toContain('No hay coincidencias');
  });

  it('assigns an unlimited license once and closes the modal after saving', async () => {
    const f = TestBed.createComponent(ChurchesComponent); f.detectChanges();
    http.expectOne(`${base}/churches`).flush([church]);
    f.componentInstance.openLicense(church);
    f.componentInstance.licenseType = 'Indefinite';
    f.componentInstance.grantLicense(); f.componentInstance.grantLicense();
    const request = http.expectOne(`${base}/churches/church-1/licenses`);
    expect(request.request.body).toEqual({ type: 'Indefinite' });
    f.componentInstance.closeLicense();
    expect(f.componentInstance.licenseChurch).not.toBeNull();
    request.flush({}); http.expectOne(`${base}/churches`).flush([church]);
    await f.whenStable();
    expect(f.componentInstance.licenseChurch).toBeNull();
    expect(f.componentInstance.licenseSaving).toBe(false);
    expect(f.nativeElement.querySelector('.notice.success').textContent).toContain('Licencia actualizada');
  });

  it('keeps a license error inside its modal and clears the pending state', async () => {
    const f = TestBed.createComponent(ChurchesComponent); f.detectChanges();
    http.expectOne(`${base}/churches`).flush([church]);
    f.componentInstance.openLicense(church); f.componentInstance.grantLicense();
    http.expectOne(`${base}/churches/church-1/licenses`).flush({ error: 'No disponible' }, { status: 500, statusText: 'Error' });
    await f.whenStable();
    expect(f.componentInstance.licenseSaving).toBe(false);
    expect(f.nativeElement.querySelector('.license-modal .notice.error').textContent).toContain('No disponible');
  });

  it('loads only global admins, sorts active users first and protects the current account', async () => {
    const f = TestBed.createComponent(GlobalAdminsComponent); f.detectChanges();
    http.expectNone(`${base}/churches`); http.expectOne(`${base}/global-admins`).flush(admins);
    await f.whenStable();
    expect(f.componentInstance.globalAdmins.map(a => a.id)).toEqual(['other', 'self', 'inactive']);
    expect(f.nativeElement.querySelector('[aria-label="Eliminar a Jorge Segura"]').disabled).toBe(true);
    const search = f.nativeElement.querySelector('input[type=search]'); search.value = 'fallas fabio'; search.dispatchEvent(new Event('input')); await f.whenStable();
    expect(f.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
    expect(f.nativeElement.querySelector('tbody').textContent).toContain('Fabio');
  });

  it('saves a global administrator and closes its dialog without another click', async () => {
    const f = TestBed.createComponent(GlobalAdminsComponent); f.detectChanges();
    http.expectOne(`${base}/global-admins`).flush(admins);
    f.componentInstance.openGlobalAdminForm();
    f.componentInstance.globalAdminForm.setValue({ name: 'Nueva Cuenta', username: 'nueva', email: 'nueva@example.com' });
    f.componentInstance.createGlobalAdmin();
    http.expectOne({ url: `${base}/global-admins`, method: 'POST' }).flush({});
    http.expectOne(`${base}/global-admins`).flush(admins);
    await f.whenStable();
    expect(f.componentInstance.showGlobalAdminForm).toBe(false);
    expect(f.componentInstance.savingGlobalAdmin).toBe(false);
    expect(f.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('preserves reset password and delete actions on the new page', async () => {
    const f = TestBed.createComponent(GlobalAdminsComponent); f.detectChanges();
    http.expectOne(`${base}/global-admins`).flush(admins);
    await f.componentInstance.resetGlobalAdminPassword(admins[2]);
    http.expectOne(`${base}/global-admins/other/reset-password`).flush({});
    await f.whenStable();
    expect(f.componentInstance.globalAdminActionId).toBe('');
    await f.componentInstance.deactivateGlobalAdmin(admins[2]);
    http.expectOne({ url: `${base}/global-admins/other`, method: 'DELETE' }).flush({});
    http.expectOne(`${base}/global-admins`).flush(admins.map(a => a.id === 'other' ? { ...a, activo: false } : a));
    await f.whenStable();
    expect(f.componentInstance.activeCount).toBe(1);
    expect(f.componentInstance.canDeactivateGlobalAdmin(admins[1])).toBe(false);
  });

  it('allows global pages without selecting a church and denies local administrators', () => {
    const guard = TestBed.inject(RoleGuard);
    for (const path of ['churches', 'global-admins', 'enseñanzas-globales']) {
      const route = { routeConfig: { path }, data: { roles: ['GlobalAdmin'] } } as unknown as ActivatedRouteSnapshot;
      expect(guard.canActivate(route)).toBe(true);
      auth.currentUser.rol = 'Admin';
      expect(TestBed.inject(Router).serializeUrl(guard.canActivate(route) as never)).toBe('/unauthorized');
      auth.currentUser.rol = 'GlobalAdmin';
    }
  });
});
