import { Component, OnInit } from '@angular/core';
import { EventContextService, EventLoadState } from '../../core/services/event-context.service';
import { AuthService } from '../../core/services/auth.service';
import { AuthUser } from '../../core/models/auth.model';
import { Event } from '../../core/models/event.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.css'],
  standalone: false
})
export class ShellComponent implements OnInit {
  activeEvent: Event | null = null;
  eventState: EventLoadState = 'loading';
  currentUser: AuthUser | null = null;
  readonly isProd = environment.production;

  get isAdmin(): boolean    { return this.auth.hasRole('Admin'); }
  get isLogistica(): boolean { return this.auth.hasRole('Logistica'); }
  get isEventos(): boolean   { return this.auth.hasRole('Eventos'); }
  get isTiempos(): boolean   { return this.auth.hasRole('Tiempos'); }

  get initials(): string {
    const name = this.currentUser?.nombre ?? '';
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }

  constructor(public eventCtx: EventContextService, private auth: AuthService) {}

  ngOnInit(): void {
    this.eventCtx.activeEvent$.subscribe(e => this.activeEvent = e);
    this.eventCtx.state$.subscribe(s => this.eventState = s);
    this.auth.user$.subscribe(u => this.currentUser = u);
  }

  logout(): void { this.auth.logout(); }
}
