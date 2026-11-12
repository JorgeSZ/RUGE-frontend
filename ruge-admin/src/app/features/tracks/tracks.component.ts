import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DialogService } from '../../core/services/dialog.service';
import { inject, ChangeDetectorRef, Component, HostListener, OnInit, DestroyRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable, of, Subscription } from 'rxjs';
import { finalize, map, switchMap } from 'rxjs/operators';
import { TrackService } from '../../core/services/track.service';
import { Track, TrackSegment } from '../../core/models/track.model';

@Component({
  selector: 'app-tracks',
  templateUrl: './tracks.component.html',
  styleUrls: ['./tracks.component.css'],
  standalone: false,
})
export class TracksComponent implements OnInit {
  private readonly dialogs = inject(DialogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  trackId: string | null = null;
  trackPage = 1;
  trackPageSize = 10;
  tracks: Track[] = [];
  selectedTrack: Track | null = null;
  loading = false;
  dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  showTrackForm = false;
  editingTrackId: string | null = null;
  trackForm: FormGroup;

  showSegmentForm = false;
  editingSegmentId: string | null = null;
  segmentForm: FormGroup;

  // ── Cascade state ─────────────────────────────────────────────────────────
  /** Whether scheduledTime in the current form was auto-set from the previous segment */
  isAutoTime = false;
  /** Whether the user manually changed the time while editing */
  timeManuallyChanged = false;
  /** Segment IDs whose scheduledTime was manually overridden */
  manualOverrides = new Set<string>();
  selectedDay = 'Todos';
  search = '';
  trackSearch = '';
  segmentType = 'all';
  page = 1;
  pageSize = 25;
  filteredSegments: TrackSegment[] = [];
  visibleSegments: TrackSegment[] = [];
  saving = false;
  error = '';
  status = '';
  draggedId: string | null = null;
  dropTargetId: string | null = null;
  dropAfter = false;
  private loadSubscription?: Subscription;
  private returnFocus: HTMLElement | null = null;

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  get filteredTracks(): Track[] {
    const query = this.normalize(this.trackSearch);
    return this.tracks.filter((t) => this.normalize(`${t.name} ${t.description ?? ''}`).includes(query));
  }

  get trackPageCount(): number {
    return Math.max(1, Math.ceil(this.filteredTracks.length / this.trackPageSize));
  }
  get pagedTracks(): Track[] {
    return this.filteredTracks.slice(
      (this.trackPage - 1) * this.trackPageSize,
      this.trackPage * this.trackPageSize,
    );
  }
  get lastTrackResult(): number {
    return Math.min(this.trackPage * this.trackPageSize, this.filteredTracks.length);
  }
  get pageCount(): number {
    return Math.max(1, Math.ceil(this.filteredSegments.length / this.pageSize));
  }
  get firstResult(): number {
    return this.filteredSegments.length ? (this.page - 1) * this.pageSize + 1 : 0;
  }
  get lastResult(): number {
    return Math.min(this.page * this.pageSize, this.filteredSegments.length);
  }
  get preachingCount(): number {
    return this.selectedTrack?.segments.filter((s) => s.predica?.trim()).length ?? 0;
  }
  get dayCount(): number {
    return new Set(this.selectedTrack?.segments.map((s) => s.dia?.trim()).filter(Boolean)).size;
  }
  get canDrag(): boolean {
    return (
      !this.saving &&
      !this.loading &&
      this.selectedDay === 'Todos' &&
      !this.search.trim() &&
      this.segmentType === 'all'
    );
  }
  trackById(_index: number, item: { id: string }): string {
    return item.id;
  }

  daySegmentCount(day: string): number {
    return (this.selectedTrack?.segments ?? []).filter(
      (s) => day === 'Todos' || (s.dia?.trim() || 'Sin día') === day,
    ).length;
  }

  applyFilters(resetPage = true): void {
    if (resetPage) this.page = 1;
    const terms = this.normalize(this.search).split(/\s+/).filter(Boolean);
    this.filteredSegments = (this.selectedTrack?.segments ?? []).filter((s) => {
      const dayMatches = this.selectedDay === 'Todos' || (s.dia?.trim() || 'Sin día') === this.selectedDay;
      const hasPreaching = !!s.predica?.trim();
      const typeMatches =
        this.segmentType === 'all' || (this.segmentType === 'preaching' ? hasPreaching : !hasPreaching);
      const text = this.normalize([s.name, s.description, s.predica, s.predicador, s.lugar].join(' '));
      return dayMatches && typeMatches && terms.every((term) => text.includes(term));
    });
    this.page = Math.max(1, Math.min(this.page, this.pageCount));
    this.visibleSegments = this.filteredSegments.slice(
      (this.page - 1) * this.pageSize,
      this.page * this.pageSize,
    );
  }

  setDay(day: string): void {
    this.selectedDay = day;
    this.applyFilters();
  }
  setPage(page: number): void {
    this.page = page;
    this.applyFilters(false);
  }
  clearFilters(): void {
    this.search = '';
    this.segmentType = 'all';
    this.setDay('Todos');
  }

  private acceptTracks(tracks: Track[]): void {
    this.tracks = tracks.map((t) => ({ ...t, segments: [...t.segments].sort((a, b) => a.order - b.order) }));
    this.selectedTrack = this.trackId ? (this.tracks.find((t) => t.id === this.trackId) ?? null) : null;
    this.trackPage = Math.min(this.trackPage, this.trackPageCount);
    if (!this.segmentDays.includes(this.selectedDay)) this.selectedDay = 'Todos';
    this.applyFilters(false);
  }

  private rememberFocus(): void {
    this.returnFocus = document.activeElement as HTMLElement;
  }
  private restoreFocus(): void {
    this.returnFocus?.focus();
  }

  @HostListener('document:keydown.escape')
  closeEditor(): void {
    if (this.saving) return;
    if (this.showTrackForm) this.cancelTrack();
    else if (this.showSegmentForm) this.cancelSegment();
  }

  trapFocus(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const elements = Array.from(
      (event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
      ),
    );
    const first = elements[0],
      last = elements[elements.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  focusEditor(): void {
    setTimeout(() =>
      document.querySelector<HTMLInputElement>('.editor-dialog input, .segment-form-card input')?.focus(),
    );
  }

  constructor(
    private fb: FormBuilder,
    private trackService: TrackService,
    private cdr: ChangeDetectorRef,
  ) {
    this.trackForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
    });
    this.segmentForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      dia: [''],
      scheduledTime: [''],
      distanceKm: [null, [Validators.min(0)]],
      estimatedTimeMinutes: [null, [Validators.required, Validators.min(1)]],
      predica: [''],
      predicador: [''],
      lugar: [''],
    });
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.trackId = params.get('trackId');
      this.showTrackForm = false;
      this.showSegmentForm = false;
      this.manualOverrides.clear();
      this.endDrag();
      this.status = '';
      this.selectedTrack = null;
      this.clearFilters();
      this.loadTracks();
    });
  }

  private fetchTracks(): Observable<Track[]> {
    return this.trackId
      ? this.trackService.getById(this.trackId).pipe(map((track) => [track]))
      : this.trackService.getAll();
  }

  loadTracks(): void {
    this.loadSubscription?.unsubscribe();
    this.loading = true;
    this.error = '';
    this.loadSubscription = this.fetchTracks()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (tracks) => this.acceptTracks(tracks),
        error: () => {
          this.error = 'No se pudieron cargar los tracks. Intenta de nuevo.';
        },
      });
  }

  // ── Time utilities ─────────────────────────────────────────────────────────

  addMinutes(hora: string, minutes: number): string {
    const [h, m] = hora.split(':').map(Number);
    const total = h * 60 + m + minutes;
    const hh = Math.floor(total / 60) % 24;
    const mm = total % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  private crossesMidnight(hora: string, minutes: number): boolean {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m + minutes >= 24 * 60;
  }

  /** End time for a segment (table display) */
  segEndTime(s: TrackSegment): { time: string; nextDay: boolean } | null {
    if (!s.scheduledTime || !s.estimatedTimeMinutes) return null;
    return {
      time: this.addMinutes(s.scheduledTime, s.estimatedTimeMinutes),
      nextDay: this.crossesMidnight(s.scheduledTime, s.estimatedTimeMinutes),
    };
  }

  /** End time computed live from current form values */
  get formEndTime(): { time: string; nextDay: boolean } | null {
    const t = this.segmentForm.get('scheduledTime')?.value;
    const m = this.segmentForm.get('estimatedTimeMinutes')?.value;
    if (!t || !m || m <= 0) return null;
    return { time: this.addMinutes(t, m), nextDay: this.crossesMidnight(t, m) };
  }

  // ── Summary getters ────────────────────────────────────────────────────────

  get totalDistanceKm(): number {
    return (this.selectedTrack?.segments ?? []).reduce((s, x) => s + (x.distanceKm ?? 0), 0);
  }

  get totalEstimatedMinutes(): number {
    return (this.selectedTrack?.segments ?? []).reduce((s, x) => s + (x.estimatedTimeMinutes ?? 0), 0);
  }

  segmentsMinutes(segments: TrackSegment[]): number {
    return segments.reduce((total, segment) => total + (segment.estimatedTimeMinutes ?? 0), 0);
  }

  segmentsKm(segments: TrackSegment[]): number {
    return segments.reduce((s, x) => s + (x.distanceKm ?? 0), 0);
  }

  // ── Track form ─────────────────────────────────────────────────────────────

  openCreateTrack(): void {
    this.rememberFocus();
    this.error = '';
    this.editingTrackId = null;
    this.trackForm.reset();
    this.showTrackForm = true;
    this.focusEditor();
  }

  openEditTrack(t: Track, event: MouseEvent): void {
    event.stopPropagation();
    this.rememberFocus();
    this.error = '';
    this.editingTrackId = t.id;
    this.trackForm.patchValue(t);
    this.showTrackForm = true;
    this.focusEditor();
  }

  submitTrack(): void {
    if (this.trackForm.invalid || this.saving) return;
    this.saving = true;
    this.error = '';
    const isNew = !this.editingTrackId;
    const request = this.editingTrackId
      ? this.trackService.update(this.editingTrackId, this.trackForm.value)
      : this.trackService.create(this.trackForm.value);
    request
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (created) => {
          this.showTrackForm = false;
          this.editingTrackId = null;
          this.restoreFocus();
          if (isNew && created?.id) void this.router.navigate(['/tracks', created.id]);
          else this.loadTracks();
        },
        error: () => {
          this.error = 'No se pudo guardar el track. Revisa los datos e intenta de nuevo.';
        },
      });
  }

  async deleteTrack(t: Track, event: MouseEvent): Promise<void> {
    event.stopPropagation();
    if (
      this.saving ||
      !(await this.dialogs.confirm(`¿Eliminar el track "${t.name}"? Esta acción no se puede deshacer.`, {
        title: 'Eliminar registro',
        confirmText: 'Eliminar',
        destructive: true,
      }))
    )
      return;
    this.saving = true;
    this.error = '';
    this.cdr.markForCheck();
    this.trackService
      .delete(t.id)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          if (this.trackId) void this.router.navigate(['/tracks']);
          else this.loadTracks();
        },
        error: () => {
          this.error = 'No se pudo eliminar el track.';
        },
      });
  }

  // ── Segment form ───────────────────────────────────────────────────────────

  openAddSegment(): void {
    this.rememberFocus();
    this.error = '';
    this.editingSegmentId = null;
    this.isAutoTime = false;
    this.timeManuallyChanged = false;
    this.segmentForm.reset();

    // Auto-populate scheduledTime from the last segment's end time
    const segs = this.selectedTrack?.segments ?? [];
    if (segs.length > 0) {
      const last = segs[segs.length - 1];
      if (last.scheduledTime && last.estimatedTimeMinutes) {
        this.segmentForm.patchValue({
          scheduledTime: this.addMinutes(last.scheduledTime, last.estimatedTimeMinutes),
        });
        this.isAutoTime = true;
      }
    }
    this.showSegmentForm = true;
    this.focusEditor();
  }

  openEditSegment(s: TrackSegment): void {
    this.rememberFocus();
    this.error = '';
    this.editingSegmentId = s.id;
    this.isAutoTime = false;
    this.timeManuallyChanged = this.manualOverrides.has(s.id);
    this.segmentForm.patchValue(s);
    this.showSegmentForm = true;
    this.focusEditor();
  }

  get segmentDays(): string[] {
    const days = [
      ...new Set(
        (this.selectedTrack?.segments ?? []).map((s) => s.dia?.trim()).filter((d): d is string => !!d),
      ),
    ];
    return [
      'Todos',
      ...days,
      ...((this.selectedTrack?.segments ?? []).some((s) => !s.dia?.trim()) ? ['Sin día'] : []),
    ];
  }

  moveSegment(segment: TrackSegment, offset: number): void {
    if (!this.selectedTrack || this.saving || this.loading) return;
    const segments = [...this.selectedTrack.segments];
    const index = segments.findIndex((s) => s.id === segment.id);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= segments.length) return;
    [segments[index], segments[target]] = [segments[target], segments[index]];
    this.saveOrder(segments);
  }

  startDrag(event: DragEvent, segment: TrackSegment): void {
    if (!this.canDrag) {
      event.preventDefault();
      return;
    }
    this.draggedId = segment.id;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', segment.id);
      const row = (event.target as HTMLElement).closest('tr');
      if (row) event.dataTransfer.setDragImage(row, 20, 20);
    }
  }

  dragOver(event: DragEvent, segment: TrackSegment): void {
    if (!this.canDrag || !this.draggedId || segment.id === this.draggedId) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.dropTargetId = segment.id;
    this.dropAfter = event.clientY > rect.top + rect.height / 2;
  }

  endDrag(): void {
    this.draggedId = null;
    this.dropTargetId = null;
  }

  dropSegment(event: DragEvent, target: TrackSegment): void {
    event.preventDefault();
    if (!this.canDrag || !this.selectedTrack || !this.draggedId || this.draggedId === target.id) {
      this.endDrag();
      return;
    }
    const original = this.selectedTrack.segments;
    const moving = original.find((s) => s.id === this.draggedId);
    if (!moving) {
      this.endDrag();
      return;
    }
    const segments = original.filter((s) => s.id !== moving.id);
    const targetIndex = segments.findIndex((s) => s.id === target.id);
    if (targetIndex < 0) {
      this.endDrag();
      return;
    }
    segments.splice(targetIndex + (this.dropAfter ? 1 : 0), 0, moving);
    this.endDrag();
    if (segments.some((s, i) => s.id !== original[i].id)) this.saveOrder(segments);
  }

  private saveOrder(segments: TrackSegment[]): void {
    if (!this.selectedTrack || this.saving) return;
    const track = this.selectedTrack;
    this.saving = true;
    this.error = '';
    this.status = '';
    this.trackService
      .reorderSegments(
        track.id,
        segments.map((s) => s.id),
      )
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          // Apply only after the server confirms; a failed save preserves the original order.
          track.segments = segments.map((s, i) => ({ ...s, order: i + 1 }));
          this.applyFilters(false);
          this.status = 'Orden de segmentos guardado.';
        },
        error: () => {
          this.error = 'No se pudo guardar el orden. Se conserva el orden anterior.';
        },
      });
  }

  /** Called when the user manually edits the scheduledTime field */
  onScheduledTimeChange(): void {
    this.isAutoTime = false;
    if (!this.editingSegmentId || !this.selectedTrack) return;

    const segs = this.selectedTrack.segments;
    const segIdx = segs.findIndex((s) => s.id === this.editingSegmentId);
    if (segIdx <= 0) return; // first segment: always manual

    const prev = segs[segIdx - 1];
    if (!prev.scheduledTime || !prev.estimatedTimeMinutes) return;

    const expected = this.addMinutes(prev.scheduledTime, prev.estimatedTimeMinutes);
    const current = this.segmentForm.get('scheduledTime')?.value;
    this.timeManuallyChanged = current !== expected;
  }

  /** Reset scheduledTime to the auto-calculated value */
  resetToAutoTime(): void {
    if (!this.editingSegmentId || !this.selectedTrack) return;
    const segs = this.selectedTrack.segments;
    const segIdx = segs.findIndex((s) => s.id === this.editingSegmentId);
    if (segIdx <= 0) return;
    const prev = segs[segIdx - 1];
    if (!prev.scheduledTime || !prev.estimatedTimeMinutes) return;
    this.segmentForm.patchValue({
      scheduledTime: this.addMinutes(prev.scheduledTime, prev.estimatedTimeMinutes),
    });
    this.timeManuallyChanged = false;
    this.manualOverrides.delete(this.editingSegmentId);
  }

  submitSegment(): void {
    if (!this.selectedTrack || this.segmentForm.invalid || this.saving) return;
    const trackId = this.selectedTrack.id;
    const editedId = this.editingSegmentId;
    const fromIdx = this.selectedTrack.segments.findIndex((s) => s.id === editedId);
    this.saving = true;
    this.error = '';
    const request = editedId
      ? this.trackService.updateSegment(trackId, editedId, this.segmentForm.value)
      : this.trackService.addSegment(trackId, this.segmentForm.value);
    request.subscribe({
      next: () => {
        if (editedId) {
          if (this.timeManuallyChanged) this.manualOverrides.add(editedId);
          else this.manualOverrides.delete(editedId);
        }
        this.showSegmentForm = false;
        this.editingSegmentId = null;
        this.isAutoTime = false;
        this.timeManuallyChanged = false;
        this.restoreFocus();
        this.refreshAfterSegment(trackId, editedId ? fromIdx : null);
      },
      error: () => {
        this.saving = false;
        this.error = 'No se pudo guardar el segmento. Intenta de nuevo.';
        this.cdr.markForCheck();
      },
    });
  }

  async deleteSegment(s: TrackSegment): Promise<void> {
    if (
      !this.selectedTrack ||
      this.saving ||
      !(await this.dialogs.confirm(`¿Eliminar el segmento "${s.name}"?`, {
        title: 'Eliminar registro',
        confirmText: 'Eliminar',
        destructive: true,
      }))
    )
      return;
    const trackId = this.selectedTrack.id;
    const deletedIdx = this.selectedTrack.segments.findIndex((seg) => seg.id === s.id);
    this.saving = true;
    this.error = '';
    this.cdr.markForCheck();
    this.trackService.deleteSegment(trackId, s.id).subscribe({
      next: () => {
        this.manualOverrides.delete(s.id);
        this.refreshAfterSegment(trackId, Math.max(0, deletedIdx - 1));
      },
      error: () => {
        this.saving = false;
        this.error = 'No se pudo eliminar el segmento.';
        this.cdr.markForCheck();
      },
    });
  }

  private refreshAfterSegment(trackId: string, fromIndex: number | null): void {
    const request = fromIndex === null ? this.fetchTracks() : this.cascadeAndReload(trackId, fromIndex);
    request
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (tracks) => this.acceptTracks(tracks),
        error: () => {
          this.error =
            'El cambio se guardó, pero no se pudo actualizar la lista o los horarios. Recarga los tracks para revisarlos.';
        },
      });
    this.cdr.markForCheck();
  }

  cancelSegment(): void {
    if (this.saving) return;
    this.showSegmentForm = false;
    this.editingSegmentId = null;
    this.isAutoTime = false;
    this.timeManuallyChanged = false;
    this.segmentForm.reset();
    this.restoreFocus();
  }

  cancelTrack(): void {
    if (this.saving) return;
    this.showTrackForm = false;
    this.editingTrackId = null;
    this.trackForm.reset();
    this.restoreFocus();
  }

  // ── Cascade ────────────────────────────────────────────────────────────────

  /**
   * Reloads tracks then propagates scheduledTime from segments[fromIndex]
   * to all subsequent segments not in manualOverrides.
   */
  private cascadeAndReload(trackId: string, fromIndex: number): Observable<Track[]> {
    return this.trackService.getById(trackId).pipe(
      switchMap((value) => {
        const tracks = [value];
        const track = tracks.find((t) => t.id === trackId);
        if (!track) return of(tracks);
        const segs = [...track.segments].sort((a, b) => a.order - b.order);
        const toUpdate: { id: string; newTime: string; segData: TrackSegment }[] = [];

        for (let i = fromIndex + 1; i < segs.length; i++) {
          if (this.manualOverrides.has(segs[i].id)) break;
          const prev = segs[i - 1];
          if (!prev.scheduledTime || !prev.estimatedTimeMinutes) break;
          const newTime = this.addMinutes(prev.scheduledTime, prev.estimatedTimeMinutes);
          if (segs[i].scheduledTime === newTime) break; // already correct
          toUpdate.push({ id: segs[i].id, newTime, segData: { ...segs[i] } });
          segs[i] = { ...segs[i], scheduledTime: newTime }; // propagate for next iteration
        }

        if (toUpdate.length === 0) return of(tracks);

        // Sequential updates to preserve causal order
        let obs: Observable<any> = of(null);
        for (const u of toUpdate) {
          obs = obs.pipe(
            switchMap(() =>
              this.trackService.updateSegment(trackId, u.id, { ...u.segData, scheduledTime: u.newTime }),
            ),
          );
        }
        return obs.pipe(
          switchMap(() => this.trackService.getById(trackId)),
          map((track) => [track]),
        );
      }),
    );
  }

  // ── Display helpers ────────────────────────────────────────────────────────

  formatTime(minutes: number | undefined): string {
    if (!minutes) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h${m > 0 ? ' ' + m + 'min' : ''}` : `${m} min`;
  }
}
