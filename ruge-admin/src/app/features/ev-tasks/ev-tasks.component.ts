import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EvTaskService } from '../../core/services/ev-task.service';
import { EventContextService } from '../../core/services/event-context.service';
import { EvTaskOverviewSegment } from '../../core/models/ev-task.model';

@Component({
  selector: 'app-ev-tasks',
  templateUrl: './ev-tasks.component.html',
  styleUrls: ['./ev-tasks.component.css'],
  standalone: false
})
export class EvTasksComponent implements OnInit {
  segments: EvTaskOverviewSegment[] = [];
  loading = true;
  error = '';

  get eventId(): string { return this.eventCtx.activeEvent!.id; }

  get globalTotal(): number { return this.segments.reduce((s, g) => s + g.total, 0); }
  get globalCompletadas(): number { return this.segments.reduce((s, g) => s + g.completadas, 0); }
  get globalObligatoriasPendientes(): number { return this.segments.reduce((s, g) => s + g.tareasObligatoriasPendientes, 0); }
  get globalPorcentaje(): number {
    return this.globalTotal === 0 ? 0 : Math.round(this.globalCompletadas / this.globalTotal * 100);
  }

  /** Group segments by trackNombre */
  get tracks(): { nombre: string; segments: EvTaskOverviewSegment[] }[] {
    const map = new Map<string, EvTaskOverviewSegment[]>();
    for (const s of this.segments) {
      if (!map.has(s.trackNombre)) map.set(s.trackNombre, []);
      map.get(s.trackNombre)!.push(s);
    }
    return Array.from(map.entries()).map(([nombre, segs]) => ({ nombre, segments: segs }));
  }

  constructor(
    public eventCtx: EventContextService,
    private evTaskService: EvTaskService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.eventCtx.activeEvent) this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.evTaskService.getOverview(this.eventId).subscribe({
      next: res => { this.segments = res.segments; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.error = 'No se pudieron cargar las tareas.'; this.loading = false; this.cdr.detectChanges(); }
    });
  }

  openSegment(segmentId: string): void {
    this.router.navigate(['/ev-tasks/segment', segmentId]);
  }

  cardClass(s: EvTaskOverviewSegment): string {
    if (s.total === 0) return 'card-neutral';
    if (s.porcentaje >= 100) return 'card-complete';
    if (s.tareasObligatoriasPendientes > 0 && s.porcentaje < 50) return 'card-danger';
    if (s.porcentaje >= 50) return 'card-warning';
    return 'card-danger';
  }

  fillClass(pct: number): string {
    if (pct >= 100) return 'fill-complete';
    if (pct >= 60) return 'fill-good';
    if (pct >= 30) return 'fill-mid';
    return 'fill-low';
  }
}
