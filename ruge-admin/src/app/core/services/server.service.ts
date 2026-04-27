import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Server, CreateServerRequest, UpdateServerRequest } from '../models/server.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ServerService {
  constructor(private api: ApiService, private http: HttpClient) {}

  private base(eventId: string) { return `/events/${eventId}/servers`; }

  getByEvent(eventId: string): Observable<Server[]> {
    return this.api.get<Server[]>(this.base(eventId));
  }

  create(eventId: string, data: Omit<CreateServerRequest, 'eventId'>): Observable<Server> {
    return this.api.post<Server>(this.base(eventId), { ...data, eventId });
  }

  update(eventId: string, id: string, data: UpdateServerRequest): Observable<Server> {
    return this.api.put<Server>(`${this.base(eventId)}/${id}`, data);
  }

  reassignCommission(eventId: string, serverId: string, commissionId: string): Observable<Server> {
    return this.api.patch<Server>(`${this.base(eventId)}/${serverId}/commission`, { commissionId });
  }

  delete(eventId: string, id: string): Observable<void> {
    return this.api.delete<void>(`${this.base(eventId)}/${id}`);
  }

  registerPublic(eventId: string, formData: FormData): Observable<any> {
    return this.http.post<any>(
      `${environment.apiUrl}/public/events/${eventId}/servers/register`,
      formData
    );
  }
}
