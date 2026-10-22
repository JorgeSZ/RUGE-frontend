import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { EventContextService } from '../services/event-context.service';

@Injectable({ providedIn: 'root' })
export class EventGuard implements CanActivate {
  constructor(
    private eventCtx: EventContextService,
    private router: Router,
    private auth: AuthService
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree | Observable<boolean | UrlTree> {
    // Si ya terminó de cargar, decidir de inmediato
    if (this.eventCtx.state !== 'loading') {
      return this.canOpen(route);
    }

    // Si todavía está cargando (e.g. recarga directa de página),
    // esperar a que el estado se resuelva
    return this.eventCtx.state$.pipe(
      filter(s => s !== 'loading'),
      take(1),
      map(() => this.canOpen(route))
    );
  }

  private canOpen(route: ActivatedRouteSnapshot): boolean | UrlTree {
    if (this.eventCtx.activeEvent) return true;

    if (route.routeConfig?.path === 'inventario-evento' && this.auth.hasRole('Inventario')) {
      return true;
    }

    return this.router.createUrlTree(['/events']);
  }
}
