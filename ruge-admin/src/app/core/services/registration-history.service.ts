import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RegistrationHistoryService {
  constructor(private http: HttpClient) {}
  private base(eventId: string) { return `${environment.apiUrl}/public/events/${eventId}/registration-history`; }

  checkParticipant(eventId: string, cedula: string) {
    return this.http.post<{ blocked: boolean; message: string | null }>(`${this.base(eventId)}/participant`, { cedula });
  }

}
