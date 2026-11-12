import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EventService } from '../../core/services/event.service';

type HistoryTab = 'summary' | 'participants' | 'servers' | 'tribes' | 'route' | 'operations' | 'inventory' | 'challenges';

@Component({
  selector: 'app-event-history',
  templateUrl: './event-history.component.html',
  styleUrls: ['./event-history.component.css'],
  standalone: false
})
export class EventHistoryComponent implements OnInit {
  data: any = null;
  loading = true;
  error = '';
  activeTab: HistoryTab = 'summary';

  readonly tabs: Array<{ id: HistoryTab; label: string }> = [
    { id: 'summary', label: 'Resumen' },
    { id: 'participants', label: 'Senderistas' },
    { id: 'servers', label: 'Servidores' },
    { id: 'tribes', label: 'Tribus' },
    { id: 'route', label: 'Ruta y tiempos' },
    { id: 'operations', label: 'Actividades y logística' },
    { id: 'inventory', label: 'Inventario del evento' },
    { id: 'challenges', label: 'Retos y puntos' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private events: EventService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const eventId = this.route.snapshot.paramMap.get('eventId');
    if (!eventId) {
      this.error = 'No se indicó qué reto consultar.';
      this.loading = false;
      return;
    }

    this.events.getHistory(eventId).subscribe({
      next: data => { this.data = data; this.loading = false; this.cdr.detectChanges(); },
      error: err => {
        this.error = err?.error?.error ?? 'No se pudo cargar el historial del reto.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  goBack(): void { this.router.navigate(['/events']); }

  fullName(person: any): string {
    return [person?.firstName, person?.firstLastName, person?.secondLastName].filter(Boolean).join(' ');
  }

  age(birthDate?: string | null): string {
    if (!birthDate) return '—';
    const born = new Date(birthDate);
    const today = new Date();
    let years = today.getFullYear() - born.getFullYear();
    const beforeBirthday = today.getMonth() < born.getMonth() ||
      (today.getMonth() === born.getMonth() && today.getDate() < born.getDate());
    if (beforeBirthday) years--;
    return String(years);
  }

  pointsForTribe(tribeId: string): number {
    return (this.data?.challenges ?? []).reduce((total: number, challenge: any) =>
      total + (challenge.scores ?? [])
        .filter((score: any) => score.tribeId === tribeId)
        .reduce((points: number, score: any) => points + Number(score.points ?? 0), 0), 0);
  }

  get rankedTribes(): any[] {
    return [...(this.data?.tribes ?? [])]
      .map(tribe => ({ ...tribe, totalPoints: this.pointsForTribe(tribe.id) }))
      .sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));
  }

  get trackSegments(): any[] { return this.data?.track?.segments ?? []; }
  get executionSegments(): any[] { return this.data?.execution?.segments ?? []; }

  timingLabel(timingStatus?: string | null, executionStatus?: string | null): string {
    switch (timingStatus) {
      case 'ON_TIME': return 'A tiempo';
      case 'EARLY': return 'Adelantado';
      case 'LATE': return 'Atrasado';
      default:
        switch (executionStatus) {
          case 'Completed': return 'Completado';
          case 'InProgress': return 'En curso';
          case 'Pending': return 'Pendiente';
          default: return executionStatus || '—';
        }
    }
  }

  get hasParticipantMedications(): boolean {
    return (this.data?.participants ?? []).some((person: any) => (person.medications ?? []).length > 0);
  }

  tribeColor(tribeId: string): string {
    return this.data?.tribes?.find((tribe: any) => tribe.id === tribeId)?.color || '#f0b429';
  }
}
