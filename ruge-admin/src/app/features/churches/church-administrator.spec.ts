import { CommonModule } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import * as icons from '../../core/icons/lucide-icons';
import { AuthService } from '../../core/services/auth.service';
import { ChurchContextService } from '../../core/services/church-context.service';
import { EventContextService } from '../../core/services/event-context.service';
import { DialogService } from '../../core/services/dialog.service';
import { environment } from '../../../environments/environment';
import { ChurchesComponent } from './churches.component';

describe('Church principal administrator', () => {
  let http: HttpTestingController;
  let confirmed: boolean;
  let role: string;
  const base = `${environment.apiUrl}/churches`;
  const old = { id: 'old', nombre: 'Admin anterior', username: 'anterior', email: 'old@example.com' };
  const next = { id: 'next', nombre: 'José Soto', username: 'jose.soto', email: 'jose@example.com', role: 'Coordinador' };
  const church = { id: 'ruge', name: 'RUGE', isActive: true, createdAt: '2026-01-01', administrator: old, license: null };
  beforeEach(async () => {
    confirmed = true; role = 'GlobalAdmin';
    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, ReactiveFormsModule, LucideAngularModule.pick(icons)],
      declarations: [ChurchesComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(),
        { provide: Router, useValue: {} }, { provide: EventContextService, useValue: {} },
        { provide: ChurchContextService, useValue: {} },
        { provide: AuthService, useValue: { get currentUser() { return { rol: role }; } } },
        { provide: DialogService, useValue: { confirm: async () => confirmed } }],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  async function render() {
    const fixture = TestBed.createComponent(ChurchesComponent);
    fixture.detectChanges();
    http.expectOne(base).flush([church]);
    await fixture.whenStable();
    return fixture;
  }
  async function open() {
    const fixture = await render();
    fixture.componentInstance.openAdministrator(fixture.componentInstance.churches[0]);
    http.expectOne(`${base}/ruge/administrator-candidates`).flush([{ ...old, role: 'Admin' }, next]);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }
  it('searches the eligible users and excludes the current principal', async () => {
    const fixture = await open();
    const component = fixture.componentInstance;
    expect(component.administratorCandidates.length).toBe(1);
    component.administratorSearch = 'soto jose';
    expect(component.filteredAdministratorCandidates[0].id).toBe('next');
    component.administratorSearch = 'jose@example';
    expect(component.filteredAdministratorCandidates.length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('El anterior conservará su rol Admin');
  });
  it('edits only church information and leaves administrator management separate', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;
    const edit = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find(button => button.textContent?.trim() === 'Editar iglesia')!;
    edit.click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[formControlName="name"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[formControlName="adminName"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[formControlName="adminEmail"]')).toBeNull();
    component.editForm.setValue({ name: 'Nuevo nombre' });
    component.saveChurchDetails();
    const req = http.expectOne({ url: `${base}/ruge`, method: 'PUT' });
    expect(req.request.body).toEqual({ name: 'Nuevo nombre' });
    req.flush({ id: church.id, name: 'Nuevo nombre' });
    http.expectOne(base).flush([{ ...church, name: 'Nuevo nombre' }]);
    await fixture.whenStable();
    expect(component.editingChurch).toBeNull();
    expect(component.savingEdit).toBe(false);
  });
  it('updates the visible administrator and closes the dialog after saving', async () => {
    const fixture = await open();
    const component = fixture.componentInstance;
    component.selectedAdministratorId = 'next';
    await component.changeAdministrator();
    const req = http.expectOne({ url: `${base}/ruge/administrator`, method: 'PUT' });
    expect(req.request.body).toEqual({ userId: 'next', expectedAdministratorUserId: 'old' });
    component.closeAdministrator();
    expect(component.administratorChurch).not.toBeNull();
    req.flush({ administrator: next });
    await fixture.whenStable();
    expect(component.administratorSaving).toBe(false);
    expect(component.administratorChurch).toBeNull();
    expect(component.churches[0].administrator?.id).toBe('next');
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });
  it('preserves the selection and permits retry after a failed save', async () => {
    const fixture = await open();
    const component = fixture.componentInstance;
    component.selectedAdministratorId = 'next';
    await component.changeAdministrator();
    http.expectOne(`${base}/ruge/administrator`).flush({ error: 'Error de prueba' }, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    expect(component.administratorSaving).toBe(false);
    expect(component.administratorChurch).not.toBeNull();
    expect(component.selectedAdministratorId).toBe('next');
    expect(component.administratorError).toBe('Error de prueba');
  });
  it('does not send a change when confirmation is cancelled', async () => {
    const fixture = await open();
    confirmed = false;
    fixture.componentInstance.selectedAdministratorId = 'next';
    await fixture.componentInstance.changeAdministrator();
    http.expectNone(req => req.method === 'PUT');
    expect(fixture.componentInstance.administratorSaving).toBe(false);
  });
  it('hides and blocks the change for a church administrator', async () => {
    role = 'Admin';
    const fixture = await render();
    expect(fixture.nativeElement.querySelector('.change-administrator')).toBeNull();
    fixture.componentInstance.openAdministrator(fixture.componentInstance.churches[0]);
    http.expectNone(`${base}/ruge/administrator-candidates`);
    expect(fixture.componentInstance.administratorChurch).toBeNull();
  });
});
