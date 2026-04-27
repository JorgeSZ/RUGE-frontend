import { Component } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-unauthorized',
  template: `
    <div class="unauth-page">
      <div class="unauth-card">
        <div class="unauth-icon">🔒</div>
        <h2>Acceso restringido</h2>
        <p>No tienes permiso para acceder a esta sección.</p>
        <button class="btn-back" (click)="back()">Volver a mi módulo</button>
      </div>
    </div>
  `,
  styles: [`
    .unauth-page { min-height: 100vh; background: var(--ruge-dark); display: flex; align-items: center; justify-content: center; padding: 24px; }
    .unauth-card { background: var(--ruge-dark-card); border: 1px solid var(--ruge-border); border-radius: 8px; padding: 48px 40px; text-align: center; max-width: 400px; width: 100%; box-shadow: 0 12px 40px rgba(0,0,0,0.5); }
    .unauth-icon { font-size: 3.5rem; margin-bottom: 16px; }
    h2 { font-family: 'Barlow Condensed', sans-serif; font-size: 1.6rem; font-weight: 800; text-transform: uppercase; color: var(--ruge-text-primary); margin: 0 0 10px; }
    p { color: var(--ruge-text-muted); margin: 0 0 28px; }
    .btn-back { background: var(--ruge-yellow); color: var(--ruge-black); border: none; border-radius: 6px; padding: 12px 32px; font-family: 'Barlow Condensed', sans-serif; font-size: 1rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; cursor: pointer; transition: background 0.2s; }
    .btn-back:hover { background: var(--ruge-yellow-dark); }
  `],
  standalone: false
})
export class UnauthorizedComponent {
  constructor(private auth: AuthService) {}
  back(): void { this.auth.navigateToHome(); }
}
