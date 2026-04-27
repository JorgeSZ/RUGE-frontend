import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { TrackService } from '../../core/services/track.service';
import { Track, TrackSegment } from '../../core/models/track.model';

@Component({
  selector: 'app-tracks',
  templateUrl: './tracks.component.html',
  styleUrls: ['./tracks.component.css'],
  standalone: false
})
export class TracksComponent implements OnInit {
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

  constructor(
    private fb: FormBuilder,
    private trackService: TrackService,
    private cdr: ChangeDetectorRef
  ) {
    this.trackForm = this.fb.group({
      name:        ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
    });
    this.segmentForm = this.fb.group({
      name:                 ['', [Validators.required, Validators.minLength(2)]],
      description:          [''],
      dia:                  [''],
      scheduledTime:        [''],
      distanceKm:           [null, [Validators.min(0)]],
      estimatedTimeMinutes: [null, [Validators.required, Validators.min(1)]],
      predica:              [''],
      predicador:           [''],
      lugar:                [''],
    });
  }

  ngOnInit(): void { this.loadTracks(); }

  loadTracks(): void {
    this.loading = true;
    this.trackService.getAll().subscribe({
      next: t => {
        this.tracks = t;
        if (this.selectedTrack) {
          this.selectedTrack = t.find(x => x.id === this.selectedTrack!.id) ?? null;
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  // ── Time utilities ─────────────────────────────────────────────────────────

  addMinutes(hora: string, minutes: number): string {
    const [h, m] = hora.split(':').map(Number);
    const total  = h * 60 + m + minutes;
    const hh     = Math.floor(total / 60) % 24;
    const mm     = total % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  private crossesMidnight(hora: string, minutes: number): boolean {
    const [h, m] = hora.split(':').map(Number);
    return (h * 60 + m + minutes) >= 24 * 60;
  }

  /** End time for a segment (table display) */
  segEndTime(s: TrackSegment): { time: string; nextDay: boolean } | null {
    if (!s.scheduledTime || !s.estimatedTimeMinutes) return null;
    return {
      time:    this.addMinutes(s.scheduledTime, s.estimatedTimeMinutes),
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

  get trackTimeRange(): string | null {
    const segs  = this.selectedTrack?.segments ?? [];
    if (!segs.length) return null;
    const first = segs[0];
    const last  = segs[segs.length - 1];
    if (!first.scheduledTime) return null;
    const end = this.segEndTime(last);
    if (!end) return `Desde ${first.scheduledTime}`;
    return `${first.scheduledTime} → ${end.time}${end.nextDay ? ' (+día siguiente)' : ''}`;
  }

  segmentsKm(segments: TrackSegment[]): number {
    return segments.reduce((s, x) => s + (x.distanceKm ?? 0), 0);
  }

  isAutoCalculated(seg: TrackSegment, index: number): boolean {
    return index > 0 && !this.manualOverrides.has(seg.id);
  }

  selectTrack(t: Track): void {
    this.selectedTrack   = t;
    this.editingSegmentId = null;
    this.segmentForm.reset();
    this.showSegmentForm = true;
  }

  // ── Track form ─────────────────────────────────────────────────────────────

  openCreateTrack(): void {
    this.editingTrackId = null;
    this.trackForm.reset();
    this.showTrackForm = true;
  }

  openEditTrack(t: Track, event: MouseEvent): void {
    event.stopPropagation();
    this.editingTrackId = t.id;
    this.trackForm.patchValue(t);
    this.showTrackForm = true;
  }

  submitTrack(): void {
    if (this.trackForm.invalid) return;
    const val = this.trackForm.value;
    if (this.editingTrackId) {
      this.trackService.update(this.editingTrackId, val).subscribe(() => {
        this.showTrackForm = false; this.loadTracks();
      });
    } else {
      this.trackService.create(val).subscribe(created => {
        this.showTrackForm = false;
        this.trackService.getAll().subscribe(tracks => {
          this.tracks = tracks;
          this.selectedTrack = tracks.find(t => t.id === created.id) ?? null;
          this.segmentForm.reset();
          this.showSegmentForm = true;
        });
      });
    }
  }

  deleteTrack(t: Track, event: MouseEvent): void {
    event.stopPropagation();
    if (!confirm(`¿Eliminar el track "${t.name}"? Esta acción no se puede deshacer.`)) return;
    this.trackService.delete(t.id).subscribe(() => {
      if (this.selectedTrack?.id === t.id) this.selectedTrack = null;
      this.loadTracks();
    });
  }

  // ── Segment form ───────────────────────────────────────────────────────────

  openAddSegment(): void {
    this.editingSegmentId    = null;
    this.isAutoTime          = false;
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
  }

  openEditSegment(s: TrackSegment): void {
    this.editingSegmentId    = s.id;
    this.isAutoTime          = false;
    this.timeManuallyChanged = false;
    this.segmentForm.patchValue(s);
    this.showSegmentForm = true;
  }

  /** Called when the user manually edits the scheduledTime field */
  onScheduledTimeChange(): void {
    this.isAutoTime = false;
    if (!this.editingSegmentId || !this.selectedTrack) return;

    const segs   = this.selectedTrack.segments;
    const segIdx = segs.findIndex(s => s.id === this.editingSegmentId);
    if (segIdx <= 0) return; // first segment: always manual

    const prev = segs[segIdx - 1];
    if (!prev.scheduledTime || !prev.estimatedTimeMinutes) return;

    const expected = this.addMinutes(prev.scheduledTime, prev.estimatedTimeMinutes);
    const current  = this.segmentForm.get('scheduledTime')?.value;
    this.timeManuallyChanged = current !== expected;
  }

  /** Reset scheduledTime to the auto-calculated value */
  resetToAutoTime(): void {
    if (!this.editingSegmentId || !this.selectedTrack) return;
    const segs   = this.selectedTrack.segments;
    const segIdx = segs.findIndex(s => s.id === this.editingSegmentId);
    if (segIdx <= 0) return;
    const prev = segs[segIdx - 1];
    if (!prev.scheduledTime || !prev.estimatedTimeMinutes) return;
    this.segmentForm.patchValue({ scheduledTime: this.addMinutes(prev.scheduledTime, prev.estimatedTimeMinutes) });
    this.timeManuallyChanged = false;
    this.manualOverrides.delete(this.editingSegmentId);
  }

  submitSegment(): void {
    if (!this.selectedTrack || this.segmentForm.invalid) return;
    const val      = this.segmentForm.value;
    const trackId  = this.selectedTrack.id;
    const editedId = this.editingSegmentId;

    if (editedId) {
      if (this.timeManuallyChanged) this.manualOverrides.add(editedId);
      else                          this.manualOverrides.delete(editedId);
    }

    const obs = editedId
      ? this.trackService.updateSegment(trackId, editedId, val)
      : this.trackService.addSegment(trackId, val);

    obs.subscribe(() => {
      this.showSegmentForm     = false;
      this.editingSegmentId    = null;
      this.isAutoTime          = false;
      this.timeManuallyChanged = false;

      if (editedId) {
        const fromIdx = this.selectedTrack!.segments.findIndex(s => s.id === editedId);
        this.cascadeAndReload(trackId, fromIdx);
      } else {
        this.loadTracks(); // new segment at end — nothing after it to cascade
      }
    });
  }

  deleteSegment(s: TrackSegment): void {
    if (!this.selectedTrack || !confirm(`¿Eliminar el segmento "${s.name}"?`)) return;
    const trackId    = this.selectedTrack.id;
    const deletedIdx = this.selectedTrack.segments.findIndex(seg => seg.id === s.id);
    this.trackService.deleteSegment(trackId, s.id).subscribe(() => {
      this.manualOverrides.delete(s.id);
      this.cascadeAndReload(trackId, Math.max(0, deletedIdx - 1));
    });
  }

  cancelSegment(): void {
    this.showSegmentForm     = false;
    this.editingSegmentId    = null;
    this.isAutoTime          = false;
    this.timeManuallyChanged = false;
    this.segmentForm.reset();
  }

  cancelTrack(): void {
    this.showTrackForm  = false;
    this.editingTrackId = null;
    this.trackForm.reset();
  }

  // ── Cascade ────────────────────────────────────────────────────────────────

  /**
   * Reloads tracks then propagates scheduledTime from segments[fromIndex]
   * to all subsequent segments not in manualOverrides.
   */
  private cascadeAndReload(trackId: string, fromIndex: number): void {
    this.trackService.getAll().subscribe(tracks => {
      this.tracks        = tracks;
      this.selectedTrack = tracks.find(t => t.id === trackId) ?? null;
      if (!this.selectedTrack) { this.cdr.detectChanges(); return; }

      const segs: TrackSegment[] = [...this.selectedTrack.segments];
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

      if (toUpdate.length === 0) { this.cdr.detectChanges(); return; }

      // Sequential updates to preserve causal order
      let obs: Observable<any> = of(null);
      for (const u of toUpdate) {
        obs = obs.pipe(
          switchMap(() => this.trackService.updateSegment(
            trackId, u.id, { ...u.segData, scheduledTime: u.newTime }
          ))
        );
      }
      obs.subscribe({ complete: () => this.loadTracks() });
    });
  }

  // ── Display helpers ────────────────────────────────────────────────────────

  formatTime(minutes: number | undefined): string {
    if (!minutes) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h${m > 0 ? ' ' + m + 'min' : ''}` : `${m} min`;
  }
}
