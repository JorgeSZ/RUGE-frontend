import { CommonModule } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { vi } from 'vitest';
import * as icons from '../core/icons/lucide-icons';
import { AuthService } from '../core/services/auth.service';
import { DialogService } from '../core/services/dialog.service';
import { EventContextService } from '../core/services/event-context.service';
import { UserDto } from '../core/models/auth.model';
import { environment } from '../../environments/environment';
import { UsersComponent } from './users/users.component';
import { ParticipantsComponent } from './participants/participants.component';
import { ServersComponent } from './servers/servers.component';

const users: UserDto[] = Array.from({ length: 26 }, (_, i) => ({
  id: `user-${i}`,
  nombre: i === 4 ? 'José Pérez' : `Persona ${String(i).padStart(2, '0')}`,
  username: `usuario${i}`,
  email: `usuario${i}@example.test`,
  rol: i < 10 ? 'Registrador' : 'Cocina',
  activo: i !== 0,
  creadoEn: '',
}));
const people = Array.from({ length: 26 }, (_, i) => ({
  id: `person-${i}`,
  eventId: 'event-1',
  firstName: `Nombre ${String(i).padStart(2, '0')}`,
  firstLastName: 'Apellido',
  cedula: `cedula-${i}`,
  checkInCompleted: i === 4,
  asistesIglesia: false,
  perteneceGrupo: false,
  hasDiscipleship: false,
  hasDiscipleshipPatch: false,
  hasGroup: false,
  estaEnNewLife: false,
  approvalStatus: i === 4 ? 'Aprobado' : 'Pendiente',
  createdAt: '',
}));

describe('User design and participant/server pagination', () => {
  let http: HttpTestingController;
  const base = environment.apiUrl;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, ReactiveFormsModule, LucideAngularModule.pick(icons)],
      declarations: [UsersComponent, ParticipantsComponent, ServersComponent],
      schemas: [NO_ERRORS_SCHEMA], // Drawers are unrelated to these table/pagination tests.
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { currentUser: { id: 'user-1', rol: 'Admin' } } },
        { provide: EventContextService, useValue: { activeEvent: { id: 'event-1', name: 'Reto' } } },
        { provide: DialogService, useValue: { confirm: () => Promise.resolve(true) } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  function click(root: HTMLElement, text: string) {
    const button = Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.trim() === text)!;
    expect(button).toBeTruthy();
    button.click();
  }
  function fill(root: HTMLElement, selector: string, value: string) {
    const field = root.querySelector<HTMLInputElement>(selector)!;
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }
  async function renderUsers() {
    const fixture = TestBed.createComponent(UsersComponent);
    fixture.detectChanges();
    http.expectOne(`${base}/users`).flush(users);
    await fixture.whenStable();
    return fixture;
  }

  it('renders users as a continuous table, active first, without role grouping headings', async () => {
    const fixture = await renderUsers();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelectorAll('tbody tr').length).toBe(10);
    expect(root.querySelector('.role-group-row')).toBeNull();
    expect(root.textContent).not.toContain('en esta página');
    expect(fixture.componentInstance.filteredUsers.at(-1)?.id).toBe('user-0');
    expect(root.querySelector('.metrics')?.textContent).toContain('26');
    expect(root.querySelector('.pagination')?.textContent).toContain('1–10 de 26');
    click(root, 'Siguiente');
    await fixture.whenStable();
    expect(root.querySelector('.pagination')?.textContent).toContain('11–20 de 26');
  });

  it('combines role, state and accent-insensitive name search and resets pagination', async () => {
    const fixture = await renderUsers();
    const root: HTMLElement = fixture.nativeElement;
    click(root, 'Siguiente');
    await fixture.whenStable();
    root.querySelectorAll<HTMLButtonElement>('.role-filters button').forEach((b) => {
      if (b.textContent?.includes('Registrador')) b.click();
    });
    fill(root, '[aria-label="Buscar usuario"]', 'perez jose');
    await fixture.whenStable();
    expect(fixture.componentInstance.page).toBe(1);
    expect(root.querySelectorAll('[data-user-id]').length).toBe(1);
    expect(root.querySelector('[data-user-id]')?.getAttribute('data-user-id')).toBe('user-4');
    const select = root.querySelector<HTMLSelectElement>('[aria-label="Filtrar por estado"]')!;
    select.value = 'inactive';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(root.textContent).toContain('No hay coincidencias');
  });

  it('requires credentials for creation and closes the modal after a successful save', async () => {
    const fixture = await renderUsers();
    const root: HTMLElement = fixture.nativeElement;
    click(root, 'Nuevo usuario');
    await fixture.whenStable();
    expect(fixture.componentInstance.form.invalid).toBe(true);
    fill(root, '#user-name', 'Nueva persona');
    expect(root.querySelector('#user-username')).toBeNull();
    fill(root, '#user-email', 'nueva@example.test');
    await fixture.whenStable();
    click(root, 'Guardar');
    await fixture.whenStable();
    const req = http.expectOne({ url: `${base}/users`, method: 'POST' });
    expect(req.request.body.username).toBeUndefined();
    expect(req.request.body.email).toBe('nueva@example.test');
    expect(root.querySelector<HTMLButtonElement>('[aria-label="Cerrar formulario"]')?.disabled).toBe(true);
    req.flush({ ...users[0], id: 'new' });
    http.expectOne(`${base}/users`).flush(users);
    await fixture.whenStable();
    expect(root.querySelector('[role="dialog"]')).toBeNull();
    expect(fixture.componentInstance.saving).toBe(false);
  });

  it('keeps failed edits open and preserves self-account restrictions', async () => {
    const fixture = await renderUsers();
    const root: HTMLElement = fixture.nativeElement;
    fixture.componentInstance.openEdit(users[1]);
    expect(fixture.componentInstance.showForm).toBe(false);
    root.querySelector<HTMLButtonElement>('[aria-label="Editar a Persona 10"]')!.click();
    await fixture.whenStable();
    expect(root.querySelector('#user-username')).toBeNull();
    click(root, 'Guardar');
    http
      .expectOne({ url: `${base}/users/user-10`, method: 'PUT' })
      .flush({ error: 'No se pudo guardar.' }, { status: 400, statusText: 'Bad request' });
    await fixture.whenStable();
    expect(root.querySelector('[role="dialog"]')?.textContent).toContain('No se pudo guardar.');
    expect(fixture.componentInstance.saving).toBe(false);
  });

  for (const type of ['participants', 'servers'] as const) {
    const url = `${base}/events/event-1/${type}`;
    const renderPeople = async () => {
      const fixture =
        type === 'participants'
          ? TestBed.createComponent(ParticipantsComponent)
          : TestBed.createComponent(ServersComponent);
      fixture.detectChanges();
      flushPeople(people);
      await fixture.whenStable();
      return fixture;
    };
    const flushPeople = (data: typeof people) => {
      http.expectOne(url).flush([...data].reverse());
      http.expectOne(`${base}/events/event-1/tribes`).flush([]);
      if (type === 'servers') http.expectOne(`${base}/commissions`).flush([]);
    };

    it(`${type}: paginates alphabetically and resets after changing check-in filter`, async () => {
      const fixture = await renderPeople();
      const root: HTMLElement = fixture.nativeElement;
      expect(root.querySelectorAll('tr.row-clickable').length).toBe(25);
      expect(root.querySelector('.name-cell')?.textContent).toContain('Nombre 00');
      click(root, 'Siguiente');
      await fixture.whenStable();
      expect(root.querySelectorAll('tr.row-clickable').length).toBe(1);
      expect(root.querySelector('.list-pagination')?.textContent).toContain('26–26 de 26');
      const chip = Array.from(root.querySelectorAll<HTMLButtonElement>('.chip')).find((b) =>
        b.textContent?.includes('Con Check-in'),
      )!;
      chip.click();
      await fixture.whenStable();
      expect(fixture.componentInstance.page).toBe(1);
      expect(root.querySelector('.name-cell')?.textContent).toContain('Nombre 04');
      expect(root.querySelectorAll('tr.row-clickable').length).toBe(1);
    });

    it(`${type}: clamps the last page after deletion and supports page-size changes`, async () => {
      const fixture = await renderPeople();
      const root: HTMLElement = fixture.nativeElement;
      click(root, 'Siguiente');
      await fixture.whenStable();
      root.querySelector<HTMLButtonElement>('tr.row-clickable .danger:last-child')!.click();
      await Promise.resolve();
      http.expectOne({ url: `${url}/person-25`, method: 'DELETE' }).flush(null);
      flushPeople(people.slice(0, 25));
      await fixture.whenStable();
      expect(fixture.componentInstance.page).toBe(1);
      expect(root.querySelectorAll('tr.row-clickable').length).toBe(25);
      const select = root.querySelector<HTMLSelectElement>('.list-page-controls select')!;
      select.value = select.options[0].value;
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
      expect(root.querySelectorAll('tr.row-clickable').length).toBe(10);
      expect(root.querySelector('.list-pagination')?.textContent).toContain('Página 1 de 3');
    });

    it(`${type}: exports all 26 records while only one row is visible`, async () => {
      const fixture = await renderPeople();
      const root: HTMLElement = fixture.nativeElement;
      click(root, 'Siguiente');
      await fixture.whenStable();
      let blob: Blob | undefined;
      vi.spyOn(URL, 'createObjectURL').mockImplementation((value) => {
        blob = value as Blob;
        return 'blob:test';
      });
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      root.querySelector<HTMLButtonElement>('.btn-export')!.click();
      const csv = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsText(blob!);
      });
      expect(csv.split('\r\n').length).toBe(27);
      expect(csv).toContain('Nombre 00');
      expect(csv).toContain('Nombre 25');
    });
  }
});
