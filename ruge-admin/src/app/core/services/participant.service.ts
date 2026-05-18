import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Participant, CreateParticipantRequest, UpdateParticipantRequest, Medication, CreateMedicationRequest, CalaqueroEntry } from '../models/participant.model';
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

  getMedications(eventId: string, participantId: string): Observable<Medication[]> {
    return this.api.get<Medication[]>(`${this.base(eventId)}/${participantId}/medications`);
  }

  addMedication(eventId: string, participantId: string, data: CreateMedicationRequest): Observable<Medication> {
    return this.api.post<Medication>(`${this.base(eventId)}/${participantId}/medications`, data);
  }

  deleteMedication(eventId: string, participantId: string, medicationId: string): Observable<void> {
    return this.api.delete<void>(`${this.base(eventId)}/${participantId}/medications/${medicationId}`);
  }

  getCalaquero(eventId: string): Observable<CalaqueroEntry[]> {
    return this.api.get<CalaqueroEntry[]>(`/events/${eventId}/calaquero`);
  }

  getConsolidacion(eventId: string): Observable<Participant[]> {
    return this.api.get<Participant[]>(`/events/${eventId}/consolidacion`);
  }
}
