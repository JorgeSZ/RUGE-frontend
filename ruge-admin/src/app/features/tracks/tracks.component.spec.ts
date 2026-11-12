import { CommonModule } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, convertToParamMap, provideRouter, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import * as icons from '../../core/icons/lucide-icons';
import { Track } from '../../core/models/track.model';
import { DialogService } from '../../core/services/dialog.service';
import { TracksComponent } from './tracks.component';

function makeTrack(count = 106): Track {
  return {
    id: 'track-1',
    name: 'Track montaña',
    description: 'Ruta del reto',
    createdAt: '',
    segments: Array.from({ length: count }, (_, i) => ({
      id: `segment-${i + 1}`,
      order: i + 1,
      name: `Tramo ${i + 1}`,
      dia: i < 50 ? 'Viernes' : 'Sábado',
      distanceKm: 1,
      estimatedTimeMinutes: 5,
      predica: i === 55 ? 'Oración' : '',
      predicador: i === 55 ? 'José Pérez' : '',
      lugar: i === 55 ? 'Río' : '',
    })),
  };
}

describe('Tracks: navigation, filters, pagination and reordering', () => {
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/tracks`;

  async function render(detail = true, track = makeTrack()) {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        RouterModule,
        LucideAngularModule.pick(icons),
      ],
      declarations: [TracksComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap(detail ? { trackId: track.id } : {})) },
        },
        { provide: DialogService, useValue: { confirm: () => Promise.resolve(true) } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(TracksComponent);
    fixture.detectChanges();
    http.expectOne(detail ? `${base}/${track.id}` : base).flush(detail ? track : [track]);
    await fixture.whenStable();
    return fixture;
  }

  afterEach(() => http?.verify());

  function button(root: HTMLElement, label: string): HTMLButtonElement {
    return Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.trim() === label)!;
  }

  function input(root: HTMLElement, selector: string, value: string) {
    const field = root.querySelector<HTMLInputElement>(selector)!;
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }

  it('shows the tracks catalog first, with links to their own detail page and no side list', async () => {
    const fixture = await render(false);
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('.catalog-table')).not.toBeNull();
    expect(root.querySelector('.segments-table')).toBeNull();
    expect(root.querySelector('.track-list')).toBeNull();
    expect(root.querySelector('a.edit')?.getAttribute('href')).toBe('/tracks/track-1');
    input(root, '[aria-label="Buscar tracks"]', 'MONTANA');
    await fixture.whenStable();
    expect(root.querySelectorAll('.catalog-table tbody tr').length).toBe(1);
    input(root, '[aria-label="Buscar tracks"]', 'inexistente');
    await fixture.whenStable();
    expect(root.textContent).toContain('No hay tracks que coincidan');
  });

  it('fetches only the selected track and renders 25 of 106 segments initially', async () => {
    const fixture = await render();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelectorAll('[data-segment-id]').length).toBe(25);
    expect(root.querySelector('.pagination')?.textContent).toContain('1–25 de 106');
    expect(root.querySelector('.metrics')?.textContent).toContain('106 segmentos');
    button(root, 'Siguiente').click();
    await fixture.whenStable();
    expect(root.querySelector('[data-segment-id]')?.getAttribute('data-segment-id')).toBe('segment-26');
    expect(root.querySelector('.pagination')?.textContent).toContain('26–50 de 106');
    http.expectNone(base);
  });

  it('combines day, accent-insensitive full-name search and preaching filter without new requests', async () => {
    const fixture = await render();
    const root: HTMLElement = fixture.nativeElement;
    button(root, 'Siguiente').click();
    await fixture.whenStable();
    const saturday = Array.from(root.querySelectorAll<HTMLButtonElement>('.day-tabs button')).find((b) =>
      b.textContent?.includes('Sábado'),
    )!;
    saturday.click();
    input(root, '[aria-label="Buscar segmentos"]', 'perez jose rio');
    const select = root.querySelector<HTMLSelectElement>('[aria-label="Tipo de segmento"]')!;
    select.value = 'preaching';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(fixture.componentInstance.page).toBe(1);
    expect(root.querySelectorAll('[data-segment-id]').length).toBe(1);
    expect(root.querySelector('[data-segment-id]')?.getAttribute('data-segment-id')).toBe('segment-56');
    expect(root.querySelector('.drag-handle')?.getAttribute('draggable')).toBe('false');
    button(root, 'Limpiar filtros').click();
    await fixture.whenStable();
    expect(root.querySelectorAll('[data-segment-id]').length).toBe(25);
  });

  it('edits in a dialog, closes it after the API response and keeps the current page', async () => {
    const track = makeTrack();
    const fixture = await render(true, track);
    const root: HTMLElement = fixture.nativeElement;
    button(root, 'Siguiente').click();
    await fixture.whenStable();
    button(root.querySelector('[data-segment-id="segment-26"]')!, 'Editar').click();
    await fixture.whenStable();
    expect(root.querySelector('[role="dialog"]')).not.toBeNull();
    input(root, '#segment-name', 'Tramo actualizado');
    button(root, 'Guardar segmento').click();
    await fixture.whenStable();
    const save = http.expectOne({ url: `${base}/track-1/segments/segment-26`, method: 'PUT' });
    expect(save.request.body.name).toBe('Tramo actualizado');
    save.flush(track);
    track.segments[25].name = 'Tramo actualizado';
    http.expectOne(`${base}/track-1`).flush(track);
    await fixture.whenStable();
    expect(root.querySelector('[role="dialog"]')).toBeNull();
    expect(root.textContent).not.toContain('Guardando');
    expect(fixture.componentInstance.page).toBe(2);
    expect(root.querySelector('[data-segment-id="segment-26"]')?.textContent).toContain('Tramo actualizado');
  });

  it('persists the entire permutation when dragging within page two, including hidden pages', async () => {
    const track = makeTrack();
    const fixture = await render(true, track);
    const root: HTMLElement = fixture.nativeElement;
    button(root, 'Siguiente').click();
    await fixture.whenStable();
    const source = root.querySelector<HTMLElement>('[data-segment-id="segment-26"] .drag-handle')!;
    const target = root.querySelector<HTMLElement>('[data-segment-id="segment-30"]')!;
    source.dispatchEvent(new Event('dragstart', { bubbles: true }));
    target.dispatchEvent(new MouseEvent('dragover', { bubbles: true, clientY: 10 }));
    target.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    const save = http.expectOne({ url: `${base}/track-1/segments/reorder`, method: 'PUT' });
    const ids: string[] = save.request.body;
    expect(ids.length).toBe(106);
    expect(new Set(ids).size).toBe(106);
    expect(ids.slice(0, 25)).toEqual(track.segments.slice(0, 25).map((s) => s.id));
    expect(ids.slice(25, 30)).toEqual(['segment-27', 'segment-28', 'segment-29', 'segment-30', 'segment-26']);
    expect(ids[105]).toBe('segment-106');
    save.flush(null);
    await fixture.whenStable();
    expect(fixture.componentInstance.page).toBe(2);
    expect(root.querySelector('[data-segment-id]')?.getAttribute('data-segment-id')).toBe('segment-27');
    expect(root.textContent).toContain('Orden de segmentos guardado');
  });

  it('keeps the original order on a failed reorder and re-enables the controls', async () => {
    const fixture = await render();
    const root: HTMLElement = fixture.nativeElement;
    root.querySelector<HTMLButtonElement>('[aria-label="Mover después: Tramo 1"]')!.click();
    const request = http.expectOne(`${base}/track-1/segments/reorder`);
    request.flush({}, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    expect(root.querySelector('[data-segment-id]')?.getAttribute('data-segment-id')).toBe('segment-1');
    expect(fixture.componentInstance.saving).toBe(false);
    expect(root.textContent).toContain('Se conserva el orden anterior');
  });

  it('blocks dragging with filters but moves via arrows relative to the full track', async () => {
    const track = makeTrack();
    const fixture = await render(true, track);
    const root: HTMLElement = fixture.nativeElement;
    input(root, '[aria-label="Buscar segmentos"]', 'Oracion');
    await fixture.whenStable();
    expect(root.querySelectorAll('[data-segment-id]').length).toBe(1);
    root
      .querySelector<HTMLElement>('.drag-handle')!
      .dispatchEvent(new Event('dragstart', { cancelable: true }));
    expect(fixture.componentInstance.draggedId).toBeNull();
    root.querySelector<HTMLButtonElement>('[aria-label="Mover antes: Tramo 56"]')!.click();
    const request = http.expectOne(`${base}/track-1/segments/reorder`);
    expect(request.request.body.slice(54, 56)).toEqual(['segment-56', 'segment-55']);
    request.flush(null);
    await fixture.whenStable();
    expect(fixture.componentInstance.search).toBe('Oracion');
  });

  it('clamps pagination when the last segment on the final page is deleted', async () => {
    const track = makeTrack(26);
    const fixture = await render(true, track);
    const root: HTMLElement = fixture.nativeElement;
    button(root, 'Siguiente').click();
    await fixture.whenStable();
    root.querySelector<HTMLButtonElement>('[aria-label="Eliminar segmento Tramo 26"]')!.click();
    await Promise.resolve();
    http.expectOne({ url: `${base}/track-1/segments/segment-26`, method: 'DELETE' }).flush(null);
    track.segments.pop();
    http.expectOne(`${base}/track-1`).flush(track);
    await fixture.whenStable();
    expect(fixture.componentInstance.page).toBe(1);
    expect(root.querySelector('.pagination')?.textContent).toContain('1–25 de 25');
  });

  it('keeps a failed edit open with its entered data and an error instead of staying in saving state', async () => {
    const fixture = await render();
    const root: HTMLElement = fixture.nativeElement;
    button(root.querySelector('[data-segment-id="segment-1"]')!, 'Editar').click();
    await fixture.whenStable();
    input(root, '#segment-name', 'Conservar este nombre');
    button(root, 'Guardar segmento').click();
    http.expectOne(`${base}/track-1/segments/segment-1`).flush({}, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    expect(root.querySelector('[role="dialog"]')).not.toBeNull();
    expect(root.querySelector<HTMLInputElement>('#segment-name')?.value).toBe('Conservar este nombre');
    expect(root.querySelector('[role="dialog"]')?.textContent).toContain('No se pudo guardar');
    expect(button(root, 'Guardar segmento').disabled).toBe(false);
  });
});
