import { CommonModule } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import * as icons from '../../core/icons/lucide-icons';
import { environment } from '../../../environments/environment';
import { ConsolidacionComponent } from './consolidacion.component';

const participants = [
  {
    id: 'p1',
    eventId: 'event-1',
    firstName: 'Ana',
    firstLastName: 'Soto',
    tribeId: 'tribe-1',
    tribeName: 'Tribu 1',
  },
  {
    id: 'p2',
    eventId: 'event-2',
    firstName: 'Luis',
    firstLastName: 'Mora',
    tribeId: 'tribe-2',
    tribeName: 'Tribu 1',
  },
];
const note = {
  id: 'note-1',
  content: 'Primera llamada\nVisita el viernes.',
  createdByName: 'Coordinador',
  createdAt: '2026-11-11T15:00:00Z',
};

describe('Consolidation follow-up notes', () => {
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/consolidacion`;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, LucideAngularModule.pick(icons)],
      declarations: [ConsolidacionComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  async function render() {
    const fixture = TestBed.createComponent(ConsolidacionComponent);
    fixture.detectChanges();
    http.expectOne(base).flush(
      participants.map((participant, index) => ({
        participant,
        eventName: index === 0 ? 'Reto anterior' : 'Reto actual',
        eventStartDate: index === 0 ? '2025-07-01T00:00:00' : '2026-11-01T00:00:00',
        eventIsArchived: index === 0,
      })),
    );
    await fixture.whenStable();
    return fixture;
  }
  function click(root: HTMLElement, text: string) {
    Array.from(root.querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === text)!
      .click();
  }
  function type(root: HTMLElement, value: string) {
    const area = root.querySelector<HTMLTextAreaElement>('textarea')!;
    area.value = value;
    area.dispatchEvent(new Event('input', { bubbles: true }));
  }

  it('loads every event without an active-event context and shows event and tribe', async () => {
    const fixture = await render();
    const root: HTMLElement = fixture.nativeElement;
    const rows = root.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Reto anterior');
    expect(rows[0].textContent).toContain('Finalizado');
    expect(rows[0].textContent).toContain('Tribu 1');
    expect(rows[1].textContent).toContain('Reto actual');
    expect(fixture.componentInstance.loading).toBe(false);
  });

  it('filters by event and keeps identically named tribes separate', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;
    expect(component.tribes.map((t) => t.id).sort()).toEqual(['tribe-1', 'tribe-2']);
    component.filterTribeId = 'tribe-1';
    component.filterEventId = 'event-2';
    component.onEventFilterChange();
    expect(component.filterTribeId).toBe('');
    expect(component.filtered.map((p) => p.id)).toEqual(['p2']);
    expect(component.tribes.map((t) => t.id)).toEqual(['tribe-2']);
    component.filterEventId = '';
    component.filterTribeId = 'tribe-1';
    component.applyFilters();
    expect(component.filtered.map((p) => p.id)).toEqual(['p1']);
  });

  it('paginates and resets the page when the search changes', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;
    component.pageSize = 1;
    component.applyFilters();
    expect(component.pageCount).toBe(2);
    expect(component.paged[0].id).toBe('p1');
    component.setPage(2);
    expect(component.paged[0].id).toBe('p2');
    component.searchTerm = 'soto ana';
    component.applyFilters();
    expect(component.page).toBe(1);
    expect(component.paged.map((p) => p.id)).toEqual(['p1']);
  });

  it('loads history only when requested and does not open the participant drawer', async () => {
    const fixture = await render();
    const root: HTMLElement = fixture.nativeElement;
    root.querySelector<HTMLButtonElement>('[aria-label="Notas de Ana Soto"]')!.click();
    http.expectOne(`${base}/p1/notes`).flush([note]);
    await fixture.whenStable();
    expect(fixture.componentInstance.drawerOpen).toBe(false);
    expect(root.querySelector('[role="dialog"]')?.textContent).toContain('Ana Soto');
    expect(root.querySelector('.note-meta')?.textContent).toContain('Coordinador');
    expect(root.querySelector('.note-content')?.textContent).toBe(note.content);
    expect(root.querySelector('time')?.getAttribute('datetime')).toBe(note.createdAt);
  });

  it('adds a note to the history and clears the editor after the server response', async () => {
    const fixture = await render();
    const root: HTMLElement = fixture.nativeElement;
    root.querySelector<HTMLButtonElement>('[aria-label="Notas de Ana Soto"]')!.click();
    http.expectOne(`${base}/p1/notes`).flush([note]);
    await fixture.whenStable();
    type(root, '  Segunda llamada  ');
    await fixture.whenStable();
    click(root, 'Agregar nota');
    await fixture.whenStable();
    const req = http.expectOne({ url: `${base}/p1/notes`, method: 'POST' });
    expect(req.request.body.content).toBe('Segunda llamada');
    expect(req.request.body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(root.querySelector<HTMLButtonElement>('.notes-close')?.disabled).toBe(true);
    req.flush({
      ...note,
      id: req.request.body.id,
      content: 'Segunda llamada',
      createdAt: '2026-11-11T16:00:00Z',
    });
    await fixture.whenStable();
    expect(root.querySelectorAll('.notes-timeline li').length).toBe(2);
    expect(root.querySelector('textarea')?.value).toBe('');
    expect(root.querySelector('.notes-success')?.textContent).toContain('Nota guardada');
  });

  it('preserves a failed note and retries with the same id', async () => {
    const fixture = await render();
    const root: HTMLElement = fixture.nativeElement;
    root.querySelector<HTMLButtonElement>('[aria-label="Notas de Ana Soto"]')!.click();
    http.expectOne(`${base}/p1/notes`).flush([]);
    await fixture.whenStable();
    type(root, 'Seguimiento pendiente');
    await fixture.whenStable();
    click(root, 'Agregar nota');
    const first = http.expectOne(`${base}/p1/notes`);
    const id = first.request.body.id;
    first.flush({}, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    expect(root.querySelector('textarea')?.value).toBe('Seguimiento pendiente');
    click(root, 'Agregar nota');
    const retry = http.expectOne(`${base}/p1/notes`);
    expect(retry.request.body.id).toBe(id);
    retry.flush({ ...note, id, content: 'Seguimiento pendiente' });
    await fixture.whenStable();
    expect(root.querySelectorAll('.notes-timeline li').length).toBe(1);
  });

  it('keeps drafts separate by person and cancels obsolete history requests', async () => {
    const fixture = await render();
    const root: HTMLElement = fixture.nativeElement;
    root.querySelector<HTMLButtonElement>('[aria-label="Notas de Ana Soto"]')!.click();
    const previous = http.expectOne(`${base}/p1/notes`);
    await fixture.whenStable();
    type(root, 'Borrador para Ana');
    click(root, 'Cerrar');
    await fixture.whenStable();
    expect(previous.cancelled).toBe(true);
    root.querySelector<HTMLButtonElement>('[aria-label="Notas de Luis Mora"]')!.click();
    http.expectOne(`${base}/p2/notes`).flush([]);
    await fixture.whenStable();
    expect(root.querySelector('textarea')?.value).toBe('');
    click(root, 'Cerrar');
    await fixture.whenStable();
    root.querySelector<HTMLButtonElement>('[aria-label="Notas de Ana Soto"]')!.click();
    http.expectOne(`${base}/p1/notes`).flush([]);
    await fixture.whenStable();
    expect(root.querySelector('textarea')?.value).toBe('Borrador para Ana');
  });

  it('rejects whitespace-only notes and offers retry when history fails', async () => {
    const fixture = await render();
    const root: HTMLElement = fixture.nativeElement;
    root.querySelector<HTMLButtonElement>('[aria-label="Notas de Ana Soto"]')!.click();
    http.expectOne(`${base}/p1/notes`).flush({}, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    expect(root.querySelector('.notes-error')?.textContent).toContain('No se pudieron cargar');
    click(root, 'Reintentar');
    http.expectOne(`${base}/p1/notes`).flush([]);
    await fixture.whenStable();
    type(root, '   ');
    await fixture.whenStable();
    expect(
      Array.from(root.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Agregar nota'),
      )?.disabled,
    ).toBe(true);
    fixture.componentInstance.saveNote();
    http.expectNone((req) => req.method === 'POST');
  });

  it('adds follow-up notes after an event ends and treats content as plain text', async () => {
    const fixture = await render();
    const root: HTMLElement = fixture.nativeElement;
    root.querySelector<HTMLButtonElement>('[aria-label="Notas de Ana Soto"]')!.click();
    http
      .expectOne(`${base}/p1/notes`)
      .flush([{ ...note, content: '<img src=x onerror=alert(1)>' }]);
    await fixture.whenStable();
    expect(root.querySelector('textarea')).not.toBeNull();
    expect(fixture.componentInstance.notesParticipant?.eventIsArchived).toBe(true);
    expect(root.querySelector('.note-content img')).toBeNull();
    expect(root.querySelector('.note-content')?.textContent).toContain('<img');
    type(root, 'Visita después del reto');
    await fixture.whenStable();
    click(root, 'Agregar nota');
    const req = http.expectOne({ url: `${base}/p1/notes`, method: 'POST' });
    req.flush({ ...note, id: req.request.body.id, content: req.request.body.content });
    await fixture.whenStable();
    expect(root.querySelector('.notes-success')?.textContent).toContain('Nota guardada');
  });
});
