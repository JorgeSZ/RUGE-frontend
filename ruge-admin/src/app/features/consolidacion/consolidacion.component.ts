import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ParticipantService } from '../../core/services/participant.service';
import { EventContextService } from '../../core/services/event-context.service';
import { TribeService } from '../../core/services/tribe.service';
import { Participant } from '../../core/models/participant.model';
import { Tribe } from '../../core/models/tribe.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-consolidacion',
  templateUrl: './consolidacion.component.html',
  styleUrls: ['./consolidacion.component.css'],
  standalone: false
})
export class ConsolidacionComponent implements OnInit {
  participants: Participant[] = [];
  tribes: Tribe[] = [];
  loading = false;
  drawerOpen = false;
  drawerParticipant: Participant | null = null;

  searchTerm = '';
  filterEdadMin: number | null = null;
  filterEdadMax: number | null = null;
  filterEstadoCivil = '';
  filterPais = '';
  filterTribeId = '';
  apiUrl = environment.apiUrl;

  readonly maritalStatuses = ['Soltero', 'Casado', 'Divorciado', 'Viudo', 'Unión libre'];

  constructor(
    private participantService: ParticipantService,
    public eventCtx: EventContextService,
    private tribeService: TribeService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void { this.load(); }

  get eventId(): string { return this.eventCtx.activeEvent?.id ?? ''; }

  get paises(): string[] {
    return [...new Set(this.participants.map(p => p.country ?? '').filter(Boolean))].sort();
  }

  get filtered(): Participant[] {
    const q = this.searchTerm.toLowerCase();
    return this.participants.filter(p => {
      if (q && !`${p.firstLastName} ${p.firstName}`.toLowerCase().includes(q)) return false;
      if (this.filterEdadMin != null && (p.age ?? 0) < this.filterEdadMin) return false;
      if (this.filterEdadMax != null && (p.age ?? 999) > this.filterEdadMax) return false;
      if (this.filterEstadoCivil && p.maritalStatus !== this.filterEstadoCivil) return false;
      if (this.filterPais && p.country !== this.filterPais) return false;
      if (this.filterTribeId && p.tribeId !== this.filterTribeId) return false;
      return true;
    });
  }

  load(): void {
    if (!this.eventId) return;
    this.loading = true;
    this.participantService.getConsolidacion(this.eventId!).subscribe({
      next: data => { this.participants = data; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
    this.tribeService.getByEvent(this.eventId).subscribe(t => { this.tribes = t; this.cdr.detectChanges(); });
  }

  openDrawer(p: Participant): void  { this.drawerParticipant = p; this.drawerOpen = true; }
  closeDrawer(): void               { this.drawerOpen = false; }
  onDrawerEdit(p: Participant): void  { this.closeDrawer(); }
  onDrawerDelete(id: string): void    { this.closeDrawer(); }
}
