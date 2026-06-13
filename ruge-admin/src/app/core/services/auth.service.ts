import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, from, Observable, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthUser, LoginRequest, LoginResponse } from '../models/auth.model';
import { EventContextService } from './event-context.service';

const TOKEN_KEY = 'ruge_token';
const USER_KEY  = 'ruge_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user = new BehaviorSubject<AuthUser | null>(null);
  readonly user$ = this._user.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private eventCtx: EventContextService
  ) {
    this.restoreSession();
  }

  get currentUser(): AuthUser | null { return this._user.value; }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    const payload = this.decode(token);
    return payload ? payload.exp * 1000 > Date.now() : false;
  }

  hasRole(role: string): boolean { return this._user.value?.rol === role; }
  hasAnyRole(roles: string[]): boolean { return roles.includes(this._user.value?.rol ?? ''); }
  getToken(): string | null { return localStorage.getItem(TOKEN_KEY); }

  /**
   * Login y carga del evento activo en una sola cadena observable.
   * El subscribe del LoginComponent solo dispara cuando AMBAS operaciones
   * terminaron, garantizando que el evento esté disponible antes de navegar.
   */
  login(req: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, req).pipe(
      tap(res => {
        // Guardar token antes de llamar initialize() para que el interceptor
        // lo incluya en la petición GET /events/active
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        this._user.next(res.user);
      }),
      // Esperar a que el evento activo esté cargado antes de completar
      switchMap(res => from(this.eventCtx.initialize()).pipe(
        // Devolver la respuesta original para que el caller la reciba
        switchMap(() => [res])
      ))
    );
  }

  logout(): void {
    const token = this.getToken();
    if (token) {
      this.http.post(`${environment.apiUrl}/auth/logout`, {}).subscribe({ error: () => {} });
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._user.next(null);
    this.eventCtx.clear();
    this.router.navigate(['/login']);
  }

  navigateToHome(): void {
    const role = this.currentUser?.rol;
    if (role === 'Admin')     this.router.navigate(['/events']);
    else if (role === 'Logistica') this.router.navigate(['/logistics']);
    else if (role === 'Eventos')   this.router.navigate(['/ev-tasks']);
    else if (role === 'Tiempos')   this.router.navigate(['/tracks']);
    else if (role === 'Cocina')    this.router.navigate(['/provision']);
    else if (role === 'Calaquero') this.router.navigate(['/calaquero']);
    else this.router.navigate(['/login']);
  }

  private restoreSession(): void {
    const token = this.getToken();
    const raw = localStorage.getItem(USER_KEY);
    if (token && raw && this.isAuthenticated()) {
      try { this._user.next(JSON.parse(raw)); } catch { this.logout(); }
    } else if (token) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }

  private decode(token: string): any {
    try {
      const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(b64));
    } catch { return null; }
  }
}
