import { Component } from '@angular/core';
import { EventContextService } from '../../core/services/event-context.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.css'],
  standalone: false
})
export class ShellComponent {
  readonly isProd = environment.production;

  get isAdmin(): boolean     { return this.auth.hasRole('Admin'); }
  get isLogistica(): boolean { return this.auth.hasRole('Logistica'); }
  get isEventos(): boolean   { return this.auth.hasRole('Eventos'); }
  get isTiempos(): boolean   { return this.auth.hasRole('Tiempos'); }
  get isCocina(): boolean    { return this.auth.hasRole('Cocina'); }

  constructor(public eventCtx: EventContextService, public auth: AuthService) {}

  logout(): void { this.auth.logout(); }
}
