import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { EventContextService } from '../services/event-context.service';

@Injectable({ providedIn: 'root' })
export class EventGuard implements CanActivate {
  constructor(private eventCtx: EventContextService, private router: Router) {}

  canActivate(): boolean | UrlTree | Observable<boolean | UrlTree> {
    // Si ya terminó de cargar, decidir de inmediato
    if (this.eventCtx.state !== 'loading') {
      return this.eventCtx.activeEvent
        ? true
        : this.router.createUrlTree(['/events']);
    }

    // Si todavía está cargando (e.g. recarga directa de página),
    // esperar a que el estado se resuelva
    return this.eventCtx.state$.pipe(
      filter(s => s !== 'loading'),
      take(1),
      map(() => this.eventCtx.activeEvent
        ? true
        : this.router.createUrlTree(['/events'])
      )
    );
  }
}
