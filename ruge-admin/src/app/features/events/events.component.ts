import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EventService } from '../../core/services/event.service';
import { TrackService } from '../../core/services/track.service';
import { EventContextService } from '../../core/services/event-context.service';
import { Event } from '../../core/models/event.model';
import { Track } from '../../core/models/track.model';

@Component({
  selector: 'app-events',
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.css'],
  standalone: false
})
export class EventsComponent implements OnInit {
  events: Event[] = [];
  tracks: Track[] = [];
  loading = false;
  showForm = false;
  editingId: string | null = null;
  form: FormGroup;
  activeEventId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private eventService: EventService,
    private trackService: TrackService,
    public eventCtx: EventContextService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      location: [''],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      trackId: [null],
    });
  }

  ngOnInit(): void {
    this.load();
    this.trackService.getAll().subscribe(t => { this.tracks = t; this.cdr.detectChanges(); });
    this.eventCtx.activeEvent$.subscribe(e => { this.activeEventId = e?.id ?? null; this.cdr.detectChanges(); });
  }

  load(): void {
    this.loading = true;
    this.eventService.getAll().subscribe({
      next: events => { this.events = events; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  select(event: Event): void {
    this.eventService.activate(event.id).subscribe({
      next: activated => { this.eventCtx.setEvent(activated); this.load(); },
      error: () => {}
    });
  }

  openCreate(): void { this.editingId = null; this.form.reset(); this.showForm = true; }

  openEdit(event: Event, e: MouseEvent): void {
    e.stopPropagation();
    this.editingId = event.id;
    this.form.patchValue({
      name: event.name,
      location: event.location,
      startDate: event.startDate?.substring(0, 10),
      endDate: event.endDate?.substring(0, 10),
      trackId: event.trackId ?? null,
    });
    this.showForm = true;
  }

  delete(event: Event, e: MouseEvent): void {
    e.stopPropagation();
    if (!confirm(`Delete event "${event.name}"?`)) return;
    this.eventService.delete(event.id).subscribe(() => {
      if (this.activeEventId === event.id) this.eventCtx.clear();
      this.load();
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    const val = this.form.value;
    if (this.editingId) {
      this.eventService.update(this.editingId, val).subscribe({
        next: () => { this.showForm = false; this.editingId = null; this.form.reset(); this.load(); }
      });
    } else {
      this.eventService.create(val).subscribe({
        next: () => { this.showForm = false; this.form.reset(); this.load(); }
      });
    }
  }

  cancel(): void { this.showForm = false; this.editingId = null; this.form.reset(); }
}
