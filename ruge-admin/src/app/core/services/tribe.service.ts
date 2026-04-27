import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Tribe, CreateTribeRequest, AutoGenerateRequest, AutoGenerateResponse } from '../models/tribe.model';

@Injectable({ providedIn: 'root' })
export class TribeService {
  constructor(private api: ApiService) {}

  private base(eventId: string) { return `/events/${eventId}/tribes`; }

  getByEvent(eventId: string): Observable<Tribe[]> {
    return this.api.get<Tribe[]>(this.base(eventId));
  }

  create(eventId: string, data: Omit<CreateTribeRequest, 'eventId'>): Observable<Tribe> {
    return this.api.post<Tribe>(this.base(eventId), { ...data, eventId });
  }

  update(eventId: string, id: string, data: Omit<CreateTribeRequest, 'eventId'>): Observable<Tribe> {
    return this.api.put<Tribe>(`${this.base(eventId)}/${id}`, data);
  }

  delete(eventId: string, id: string): Observable<void> {
    return this.api.delete<void>(`${this.base(eventId)}/${id}`);
  }

  autoGenerate(eventId: string, data: AutoGenerateRequest): Observable<AutoGenerateResponse> {
    return this.api.post<AutoGenerateResponse>(`${this.base(eventId)}/auto-generate`, data);
  }

  deleteAll(eventId: string): Observable<void> {
    return this.api.delete<void>(`${this.base(eventId)}/all`);
  }
}
