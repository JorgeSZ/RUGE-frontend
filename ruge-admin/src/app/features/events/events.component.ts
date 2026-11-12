import { DialogService } from '../../core/services/dialog.service';
import { inject, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EventService } from '../../core/services/event.service';
import { TrackService } from '../../core/services/track.service';
import { EventContextService } from '../../core/services/event-context.service';
import { Event } from '../../core/models/event.model';
import { Track } from '../../core/models/track.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-events',
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.css'],
  standalone: false
})
export class EventsComponent implements OnInit {
  private readonly dialogs = inject(DialogService);
  events: Event[] = [];
  tracks: Track[] = [];
  loading = false;
  showForm = false;
  editingId: string | null = null;
  form: FormGroup;
  activeEventId: string | null = null;
  archivingId: string | null = null;
  success = '';
  error = '';

  constructor(
    private fb: FormBuilder,
    private eventService: EventService,
    private trackService: TrackService,
    public eventCtx: EventContextService,
    private router: Router,
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
      next: events => {
        this.events = events.sort((a, b) => {
          const rank = (event: Event) => event.isActive ? 0 : event.isArchived ? 2 : 1;
          return rank(a) - rank(b) || new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        });
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  select(event: Event): void {
    if (event.isArchived) return;
    this.error = '';
    this.eventService.activate(event.id).subscribe({
      next: activated => { this.eventCtx.setEvent(activated); this.load(); },
      error: err => { this.error = err?.error?.error ?? 'No se pudo activar el reto.'; this.cdr.detectChanges(); }
    });
  }

  async archive(event: Event, e: MouseEvent): Promise<void> {
    e.stopPropagation();
    if (event.isArchived || this.archivingId) return;
    const confirmed = (await this.dialogs.confirm(`¿Finalizar “${event.name}”? Quedará archivado, no se podrá editar y su historial seguirá disponible.`, { title: 'Finalizar y archivar', confirmText: 'Finalizar reto', destructive: false }));
    this.cdr.markForCheck();
    if (!confirmed) return;

    this.archivingId = event.id;
    this.error = '';
    this.success = '';
    this.eventService.archive(event.id).subscribe({
      next: () => {
        if (this.activeEventId === event.id) this.eventCtx.clear();
        this.success = `“${event.name}” quedó finalizado y archivado.`;
        this.archivingId = null;
        this.load();
      },
      error: err => {
        this.error = err?.error?.error ?? 'No se pudo finalizar el reto.';
        this.archivingId = null;
        this.cdr.detectChanges();
      }
    });
  }

  openHistory(event: Event): void {
    if (event.isArchived) this.router.navigate(['/event-history', event.id]);
  }

  openCreate(): void { this.editingId = null; this.form.reset(); this.showForm = true; }

  openEdit(event: Event, e: MouseEvent): void {
    e.stopPropagation();
    if (event.isArchived) return;
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

  async delete(event: Event, e: MouseEvent): Promise<void> {
    e.stopPropagation();
    if (event.isArchived) return;
    if (!(await this.dialogs.confirm(`¿Eliminar el reto "${event.name}"?`, { title: 'Eliminar registro', confirmText: 'Eliminar', destructive: true }))) return;
    this.cdr.markForCheck();
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
