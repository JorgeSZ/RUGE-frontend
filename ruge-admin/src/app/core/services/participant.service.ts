import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Participant, CreateParticipantRequest, UpdateParticipantRequest } from '../models/participant.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ParticipantService {
  constructor(private api: ApiService, private http: HttpClient) {}

  private base(eventId: string) { return `/events/${eventId}/participants`; }

  getByEvent(eventId: string): Observable<Participant[]> {
    return this.api.get<Participant[]>(this.base(eventId));
  }

  create(eventId: string, data: Omit<CreateParticipantRequest, 'eventId'>): Observable<Participant> {
    return this.api.post<Participant>(this.base(eventId), { ...data, eventId });
  }

  update(eventId: string, id: string, data: UpdateParticipantRequest): Observable<Participant> {
    return this.api.put<Participant>(`${this.base(eventId)}/${id}`, data);
  }

  delete(eventId: string, id: string): Observable<void> {
    return this.api.delete<void>(`${this.base(eventId)}/${id}`);
  }

  registerPublic(eventId: string, formData: FormData): Observable<any> {
    return this.http.post<any>(
      `${environment.apiUrl}/public/events/${eventId}/senderistas/register`,
      formData
    );
  }
}
