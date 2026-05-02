import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Tribe, CreateTribeRequest, AutoGenerateRequest, AutoGenerateResponse } from '../models/tribe.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TribeService {
  constructor(private api: ApiService, private http: HttpClient) {}

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

  exportExcel(eventId: string, eventName: string): void {
    const url = `${environment.apiUrl}/events/${eventId}/tribes/export`;
    const date = new Date().toISOString().substring(0, 10);
    this.http.get(url, { responseType: 'blob' }).subscribe(blob => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `tribus-${eventName}-${date}.xlsx`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 5000);
    });
  }
}
