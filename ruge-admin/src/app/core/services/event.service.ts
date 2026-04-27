import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Event } from '../models/event.model';

@Injectable({ providedIn: 'root' })
export class EventService {
  constructor(private api: ApiService) {}

  getAll(): Observable<Event[]> {
    return this.api.get<Event[]>('/events');
  }

  getById(id: string): Observable<Event> {
    return this.api.get<Event>(`/events/${id}`);
  }

  create(data: Partial<Event>): Observable<Event> {
    return this.api.post<Event>('/events', data);
  }

  update(id: string, data: Partial<Event>): Observable<Event> {
    return this.api.put<Event>(`/events/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/events/${id}`);
  }

  getActive(): Observable<Event | null> {
    return this.api.get<Event | null>('/events/active');
  }

  activate(id: string): Observable<Event> {
    return this.api.patch<Event>(`/events/${id}/activate`, {});
  }
}
