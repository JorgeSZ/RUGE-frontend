import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { Event } from '../models/event.model';
import { environment } from '../../../environments/environment';

export type EventLoadState = 'loading' | 'loaded' | 'empty';

const EVENT_CACHE_KEY = 'ruge_active_event';

@Injectable({ providedIn: 'root' })
export class EventContextService {
  private _event = new BehaviorSubject<Event | null>(null);
  private _state = new BehaviorSubject<EventLoadState>('loading');

  readonly activeEvent$ = this._event.asObservable();
  readonly state$ = this._state.asObservable();

  get activeEvent(): Event | null { return this._event.value; }
  get state(): EventLoadState { return this._state.value; }

  constructor(private http: HttpClient) {
    // Optimistic: emit cached event immediately so guards/components
    // never see null if the user already had an active event.
    const cached = this.readCache();
    if (cached) this._event.next(cached);
    // _state stays 'loading' until initialize() resolves.
  }

  /**
   * Called by APP_INITIALIZER — blocks Angular bootstrap until resolved.
   * Confirms the cached event with the backend and updates state.
   */
  async initialize(): Promise<void> {
    try {
      const event = await firstValueFrom(
        this.http.get<Event | null>(`${environment.apiUrl}/events/active`)
      );
      if (event?.id) {
        this.setEvent(event);
      } else {
        this.clearState();
      }
    } catch {
      // Network error: accept the cached value as valid if present.
      this._state.next(this._event.value ? 'loaded' : 'empty');
    }
  }

  setEvent(event: Event): void {
    this._event.next(event);
    this._state.next('loaded');
    try { localStorage.setItem(EVENT_CACHE_KEY, JSON.stringify(event)); } catch { /* private mode */ }
  }

  clear(): void {
    this.clearState();
  }

  private clearState(): void {
    this._event.next(null);
    this._state.next('empty');
    try { localStorage.removeItem(EVENT_CACHE_KEY); } catch { /* private mode */ }
  }

  private readCache(): Event | null {
    try {
      const raw = localStorage.getItem(EVENT_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.id ? parsed as Event : null;
    } catch { return null; }
  }
}
