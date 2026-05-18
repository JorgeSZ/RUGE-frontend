import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ParticipantService } from '../../core/services/participant.service';
import { EventContextService } from '../../core/services/event-context.service';
import { CalaqueroEntry } from '../../core/models/participant.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-calaquero',
  templateUrl: './calaquero.component.html',
  styleUrls: ['./calaquero.component.css'],
  standalone: false
})
export class CalaqueroComponent implements OnInit {
  entries: CalaqueroEntry[] = [];
  loading = false;
  searchTerm = '';
  filterTribu = '';

  constructor(
    private participantService: ParticipantService,
    public eventCtx: EventContextService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void { this.load(); }

  get eventId(): string { return this.eventCtx.activeEvent?.id ?? ''; }

  get tribus(): string[] {
    return [...new Set(this.entries.map(e => e.tribu ?? '').filter(Boolean))].sort();
  }

  get filtered(): CalaqueroEntry[] {
    const q = this.searchTerm.toLowerCase();
    return this.entries.filter(e => {
      const nameMatch = !q || e.nombreCompleto.toLowerCase().includes(q);
      const tribuMatch = !this.filterTribu || e.tribu === this.filterTribu;
      return nameMatch && tribuMatch;
    });
  }

  load(): void {
    if (!this.eventId) return;
    this.loading = true;
    this.participantService.getCalaquero(this.eventId).subscribe({
      next: data => { this.entries = data; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  exportExcel(): void {
    window.open(`${environment.apiUrl}/events/${this.eventId}/calaquero/export`, '_blank');
  }
}
