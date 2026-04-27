import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LogisticsService } from '../../core/services/logistics.service';
import { EventContextService } from '../../core/services/event-context.service';
import { LogisticOverviewSegment } from '../../core/models/logistic.model';

@Component({
  selector: 'app-logistics',
  templateUrl: './logistics.component.html',
  styleUrls: ['./logistics.component.css'],
  standalone: false
})
export class LogisticsComponent implements OnInit {
  segments: LogisticOverviewSegment[] = [];
  loading = true;
  error = '';

  constructor(
    public eventCtx: EventContextService,
    private logisticsService: LogisticsService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.eventCtx.activeEvent) {
      this.load();
    }
  }

  get eventId(): string { return this.eventCtx.activeEvent!.id; }

  load(): void {
    this.loading = true;
    this.logisticsService.getOverview(this.eventId).subscribe({
      next: res => {
        this.segments = res.segments;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'No se pudieron cargar los segmentos.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openSegment(segmentId: string): void {
    this.router.navigate(['/logistics/segment', segmentId]);
  }

  colorClass(pct: number): string {
    if (pct >= 100) return 'fill-complete';
    if (pct >= 60) return 'fill-good';
    if (pct >= 30) return 'fill-mid';
    return 'fill-low';
  }
}
