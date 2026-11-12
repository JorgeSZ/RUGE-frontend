import { LucideAngularModule } from 'lucide-angular';
import * as icons from '../../core/icons/lucide-icons';
import { CommonModule } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Teaching } from '../../core/models/teaching.model';
import { EventContextService } from '../../core/services/event-context.service';
import { EventTeachingsComponent } from './event-teachings.component';
import { TeachingsAdminComponent } from './teachings-admin.component';

const teaching: Teaching = {
  id: 'teaching-1', name: 'Agua viva', objectives: 'Comprender el mensaje',
  generalMessage: 'Mensaje general', pdfFileName: 'agua-viva.pdf', hasPdf: true,
  isActive: true, version: 1, createdAt: '2026-11-10T12:00:00Z', updatedAt: '2026-11-10T12:00:00Z'
};

describe('Teaching screens after asynchronous API responses', () => {
  let http: HttpTestingController;
  const catalogUrl = `${environment.apiUrl}/teachings`;
  const eventUrl = `${environment.apiUrl}/events/event-1/teachings`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, LucideAngularModule.pick(icons)],
      declarations: [TeachingsAdminComponent, EventTeachingsComponent],
      providers: [
        provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ eventId: 'event-1' }) } } },
        { provide: EventContextService, useValue: { activeEvent: { id: 'event-1' } } }
      ]
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('replaces the global loading message with the catalog without another click', async () => {
    const fixture = TestBed.createComponent(TeachingsAdminComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.loading')).not.toBeNull();

    http.expectOne(catalogUrl).flush([teaching]);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.loading')).toBeNull();
    expect(fixture.nativeElement.querySelector('tbody .teaching-name').textContent).toContain('Agua viva');
  });

  it('shows a loading error immediately instead of leaving the spinner visible', async () => {
    const fixture = TestBed.createComponent(TeachingsAdminComponent);
    fixture.detectChanges();
    http.expectOne(catalogUrl).flush({ error: 'No se pudo consultar el catálogo.' }, { status: 500, statusText: 'Error' });
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.loading')).toBeNull();
    expect(fixture.nativeElement.querySelector('.notice.error').textContent).toContain('No se pudo consultar');
  });

  it('closes the editor after saving and renders the refreshed catalog', async () => {
    const fixture = TestBed.createComponent(TeachingsAdminComponent);
    fixture.detectChanges();
    http.expectOne(catalogUrl).flush([teaching]);
    await fixture.whenStable();

    const editButton = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find(button => button.textContent?.trim() === 'Editar')!;
    editButton.click();
    await fixture.whenStable();
    (fixture.nativeElement.querySelector('.modal-actions .primary-btn') as HTMLButtonElement).click();
    await Promise.resolve();
    http.expectOne({ url: `${catalogUrl}/${teaching.id}`, method: 'PUT' }).flush(teaching);
    http.expectOne(catalogUrl).flush([teaching]);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.editor-modal')).toBeNull();
    expect(fixture.nativeElement.querySelector('.loading')).toBeNull();
    expect(fixture.nativeElement.querySelector('.notice.success').textContent).toContain('actualizada');
  });

  it('renders the event teachings when the API response arrives', async () => {
    const fixture = TestBed.createComponent(EventTeachingsComponent);
    fixture.detectChanges();
    http.expectOne(eventUrl).flush({
      eventId: 'event-1', eventName: 'Reto de prueba', isArchived: false, servers: [],
      teachings: [{ ...teaching, currentAssignment: null, assignmentHistory: [] }]
    });
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.loading')).toBeNull();
    expect(fixture.nativeElement.querySelector('tbody .teaching-name').textContent).toContain('Agua viva');
    expect(fixture.nativeElement.querySelector('.event-teaching-card')).toBeNull();
    expect(fixture.nativeElement.querySelector('.server-search')).toBeNull();
  });

  it('shows archived assignments in the table and keeps the details read-only', async () => {
    const fixture = TestBed.createComponent(EventTeachingsComponent);
    fixture.detectChanges();
    http.expectOne(eventUrl).flush({
      eventId: 'event-1', eventName: 'Reto finalizado', isArchived: true, servers: [],
      teachings: [{ ...teaching, currentAssignment: {
        id: 'saved', globalTeachingId: teaching.id, teachingNameSnapshot: teaching.name,
        teachingVersion: 1, serverId: 'server', serverName: 'Ana López', serverEmail: 'ana@example.com',
        isCurrent: true, assignedAt: '2026-11-01T10:00:00Z'
      }, assignmentHistory: [] }]
    });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.server-cell').textContent.trim()).toBe('Ana López');
    expect(fixture.nativeElement.textContent).not.toContain('ana@example.com');
    fixture.nativeElement.querySelector('[data-action=details]').click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.teaching-info').textContent).toContain('Comprender el mensaje');
    expect(fixture.nativeElement.querySelector('.assign-controls')).toBeNull();
    expect(fixture.nativeElement.querySelector('.assignment-current').textContent).toContain('ana@example.com');
    expect(fixture.nativeElement.querySelector('.table-actions').textContent).toContain('Copia asignada');
  });

  it('filters the global catalog and expands full content within the table', async () => {
    const fixture = TestBed.createComponent(TeachingsAdminComponent);
    fixture.detectChanges();
    http.expectOne(catalogUrl).flush([teaching, { ...teaching, id: 'second', name: 'Otra enseñanza', pdfFileName: 'otra.pdf', isActive: false }]);
    await fixture.whenStable();
    const search = fixture.nativeElement.querySelector('input[type=search]') as HTMLInputElement;
    search.value = 'agua'; search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
    fixture.nativeElement.querySelector('.teaching-title').click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.teaching-details').textContent).toContain('Comprender el mensaje');
    expect(fixture.nativeElement.querySelector('.teaching-card')).toBeNull();
  });

  const searchData = {
    eventId: 'event-1', eventName: 'Reto de prueba', isArchived: false,
    servers: [
      { id: 'jose', name: 'José Manuel Zúñiga López', email: 'jose@example.com' },
      { id: 'ana', name: 'Ana López Vargas', email: 'ana@example.com' },
      { id: 'no-email', name: 'Carlos Pérez', email: null },
      ...Array.from({ length: 100 }, (_, index) => ({
        id: `server-${index}`, name: `Servidor Apellido ${index}`, email: `server${index}@example.com`
      }))
    ],
    teachings: [teaching, { ...teaching, id: 'teaching-2', name: 'Segunda enseñanza' }]
      .map(item => ({ ...item, currentAssignment: null, assignmentHistory: [] }))
  };

  async function createSearchFixture() {
    const fixture = TestBed.createComponent(EventTeachingsComponent);
    fixture.detectChanges();
    http.expectOne(eventUrl).flush(searchData);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('[data-action=details]').click();
    await fixture.whenStable();
    return fixture;
  }

  it('searches 103 servers in a single combobox, ignoring accents and word order', async () => {
    const fixture = await createSearchFixture();
    const input = fixture.nativeElement.querySelector('.server-search') as HTMLInputElement;
    input.focus();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.assign-controls select')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.server-option').length).toBe(103);
    input.value = '  ZUNIGA jose  ';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.server-option').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.server-option').textContent).toContain('José Manuel Zúñiga López');
    expect(fixture.nativeElement.querySelector('.server-results').textContent).toContain('1 de 103');
    expect(fixture.componentInstance.serverOptions['teaching-2'].length).toBe(103);
    http.expectNone(eventUrl);
  });

  it('clears the selected recipient when typing and handles empty results and unavailable servers', async () => {
    const fixture = await createSearchFixture();
    const input = fixture.nativeElement.querySelector('.server-search') as HTMLInputElement;
    input.focus();
    await fixture.whenStable();
    (fixture.nativeElement.querySelector('.server-option') as HTMLElement).click();
    await fixture.whenStable();
    expect(input.value).toBe('José Manuel Zúñiga López');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect((fixture.nativeElement.querySelector('.assign-btn') as HTMLButtonElement).disabled).toBe(false);

    input.value = 'sin coincidencias';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.componentInstance.selectedServerIds[teaching.id]).toBe('');
    expect((fixture.nativeElement.querySelector('.assign-btn') as HTMLButtonElement).disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.server-empty').textContent).toContain('No hay coincidencias');
    input.value = '';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.server-option').length).toBe(103);
    const unavailable = fixture.nativeElement.querySelector('[role=option][aria-disabled=true]') as HTMLElement;
    unavailable.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.selectedServerIds[teaching.id]).toBe('');
    expect((fixture.nativeElement.querySelector('.assign-btn') as HTMLButtonElement).disabled).toBe(true);
  });

  it('sends only the ID explicitly chosen in the suggestion list', async () => {
    const fixture = await createSearchFixture();
    const input = fixture.nativeElement.querySelector('.server-search') as HTMLInputElement;
    input.value = 'lopez';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.server-option').length).toBe(2);
    (fixture.nativeElement.querySelectorAll('.server-option')[1] as HTMLElement).click();
    await fixture.whenStable();
    expect(input.value).toBe('Ana López Vargas');
    (fixture.nativeElement.querySelector('.assign-btn') as HTMLButtonElement).click();
    const request = http.expectOne({ url: `${eventUrl}/${teaching.id}/assign`, method: 'POST' });
    expect(request.request.body).toEqual({ serverId: 'ana' });
    request.flush({ id: 'assignment-1', serverName: 'Ana López Vargas' });
    http.expectOne(eventUrl).flush(searchData);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.notice.success').textContent).toContain('Ana López Vargas');
  });

  it('supports keyboard selection and closes on Escape or blur without selecting typed text', async () => {
    const fixture = await createSearchFixture();
    const input = fixture.nativeElement.querySelector('.server-search') as HTMLInputElement;
    input.focus();
    input.value = 'lopez';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    await fixture.whenStable();
    expect(input.getAttribute('aria-activedescendant')).toBe('server-option-teaching-1-1');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await fixture.whenStable();
    expect(input.value).toBe('Ana López Vargas');
    expect(fixture.componentInstance.selectedServerIds[teaching.id]).toBe('ana');
    input.value = 'carlos';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await fixture.whenStable();
    expect(fixture.componentInstance.selectedServerIds[teaching.id]).toBe('');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(input.getAttribute('aria-expanded')).toBe('false');
    input.click();
    await fixture.whenStable();
    expect(input.getAttribute('aria-expanded')).toBe('true');
    input.blur();
    await fixture.whenStable();
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });
});
