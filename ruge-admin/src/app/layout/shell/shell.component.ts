import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { EventContextService } from '../../core/services/event-context.service';
import { AuthService } from '../../core/services/auth.service';
import { ChurchContextService } from '../../core/services/church-context.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.css'],
  standalone: false
})
export class ShellComponent {
  readonly isProd = environment.production;
  mobileNavigationOpen = false;
  get isConsolidation(): boolean { return this.router.url.split(/[?#]/)[0] === '/consolidacion'; }
  get isGlobalArea(): boolean {
    return this.isGlobalAdmin && ['/churches', '/global-admins', '/enseñanzas-globales'].includes(decodeURI(this.router.url.split(/[?#]/)[0]));
  }
  get globalPageName(): string {
    const path = decodeURI(this.router.url.split(/[?#]/)[0]);
    return path === '/global-admins' ? 'Administradores globales' : path === '/enseñanzas-globales' ? 'Catálogo de enseñanzas' : 'Iglesias y licencias';
  }

  get isGlobalAdmin(): boolean { return this.auth.hasRole('GlobalAdmin'); }
  get isAdmin(): boolean     {
    return this.auth.hasAnyRole(['Admin', 'Coordinador']) ||
      (this.isGlobalAdmin && !!this.churchCtx.selectedChurchId);
  }
  get isLogistica(): boolean { return this.auth.hasRole('Logistica'); }
  get isEventos(): boolean   { return this.auth.hasRole('Eventos'); }
  get isTiempos(): boolean   { return this.auth.hasRole('Tiempos'); }
  get isCocina(): boolean    { return this.auth.hasRole('Cocina'); }
  get isCalaquero(): boolean { return this.auth.hasRole('Calaquero'); }
  get isInventario(): boolean { return this.auth.hasRole('Inventario'); }
  get isRegistrador(): boolean { return this.auth.hasRole('Registrador'); }

  constructor(public eventCtx: EventContextService, public auth: AuthService, public churchCtx: ChurchContextService, private router: Router) {}

  logout(): void { this.auth.logout(); }
}
