import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  EventTeachingsResponse,
  Teaching,
  TeachingSaveRequest
} from '../models/teaching.model';

@Injectable({ providedIn: 'root' })
export class TeachingService {
  private readonly baseUrl = `${environment.apiUrl}/teachings`;

  constructor(private http: HttpClient) {}

  listGlobal() {
    return this.http.get<Teaching[]>(this.baseUrl);
  }

  create(request: TeachingSaveRequest) {
    return this.http.post<Teaching>(this.baseUrl, this.toFormData(request));
  }

  update(id: string, request: TeachingSaveRequest) {
    return this.http.put<Teaching>(`${this.baseUrl}/${id}`, this.toFormData(request));
  }

  setActive(id: string, isActive: boolean) {
    return this.http.patch<Teaching>(`${this.baseUrl}/${id}/status`, { isActive });
  }

  deleteGlobal(id: string) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  globalPdf(id: string) {
    return this.http.get(`${this.baseUrl}/${id}/pdf`, { responseType: 'blob' });
  }

  listForEvent(eventId: string) {
    return this.http.get<EventTeachingsResponse>(`${environment.apiUrl}/events/${eventId}/teachings`);
  }

  previewForEvent(eventId: string, teachingId: string) {
    return this.http.get(`${environment.apiUrl}/events/${eventId}/teachings/${teachingId}/preview`, { responseType: 'blob' });
  }

  assignedPdf(eventId: string, assignmentId: string) {
    return this.http.get(`${environment.apiUrl}/events/${eventId}/teachings/assignments/${assignmentId}/pdf`, { responseType: 'blob' });
  }

  assign(eventId: string, teachingId: string, serverId: string) {
    return this.http.post<TeachingAssignmentResponse>(
      `${environment.apiUrl}/events/${eventId}/teachings/${teachingId}/assign`,
      { serverId }
    );
  }

  private toFormData(request: TeachingSaveRequest): FormData {
    const form = new FormData();
    form.append('name', request.name);
    form.append('objectives', request.objectives);
    form.append('generalMessage', request.generalMessage);
    form.append('isActive', String(request.isActive));
    if (request.pdfFile) form.append('pdfFile', request.pdfFile, request.pdfFile.name);
    return form;
  }
}

interface TeachingAssignmentResponse {
  id: string;
  serverName: string;
}
