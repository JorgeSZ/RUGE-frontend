import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { EventContextService } from '../../core/services/event-context.service';
import { TribeChallengeEntry, TribeChallengeOverview } from '../../core/models/tribe-challenge.model';
import { TribeChallengeService } from '../../core/services/tribe-challenge.service';

@Component({
  selector: 'app-tribe-challenges',
  templateUrl: './tribe-challenges.component.html',
  styleUrls: ['./tribe-challenges.component.css'],
  standalone: false
})
export class TribeChallengesComponent implements OnInit {
  overview: TribeChallengeOverview | null = null;
  loading = false;
  error = '';
  deletingChallengeId: string | null = null;

  constructor(
    public eventCtx: EventContextService,
    private challenges: TribeChallengeService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    const eventId = this.eventCtx.activeEvent?.id;
    if (!eventId) return;
    this.loading = true;
    this.error = '';
    this.challenges.getOverview(eventId).subscribe({
      next: overview => { this.overview = overview; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.error = 'No se pudo cargar el puntaje de las tribus.'; this.loading = false; this.cdr.detectChanges(); }
    });
  }

  deleteChallenge(challenge: TribeChallengeEntry): void {
    const eventId = this.eventCtx.activeEvent?.id;
    if (!eventId || !confirm(`¿Eliminar el reto "${challenge.name}" y sus puntos? Esta acción no se puede deshacer.`)) return;

    this.deletingChallengeId = challenge.id;
    this.error = '';
    this.challenges.delete(eventId, challenge.id).subscribe({
      next: () => {
        this.deletingChallengeId = null;
        this.load();
      },
      error: () => {
        this.deletingChallengeId = null;
        this.error = `No se pudo eliminar el reto "${challenge.name}".`;
        this.cdr.detectChanges();
      }
    });
  }
}
