import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Commission, CreateCommissionRequest } from '../models/commission.model';
import { Server } from '../models/server.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CommissionService {
  constructor(private api: ApiService, private http: HttpClient) {}

  getAll(eventId?: string): Observable<Commission[]> {
    const params = eventId ? `?eventId=${eventId}` : '';
    return this.api.get<Commission[]>(`/commissions${params}`);
  }

  create(data: CreateCommissionRequest): Observable<Commission> {
    return this.api.post<Commission>('/commissions', data);
  }

  update(id: string, data: CreateCommissionRequest): Observable<Commission> {
    return this.api.put<Commission>(`/commissions/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/commissions/${id}`);
  }

  getServers(commissionId: string, eventId: string): Observable<Server[]> {
    return this.api.get<Server[]>(`/commissions/${commissionId}/servers?eventId=${eventId}`);
  }

  exportExcel(eventId: string, eventName: string): void {
    const url = `${environment.apiUrl}/events/${eventId}/commissions/export`;
    const date = new Date().toISOString().substring(0, 10);
    this.http.get(url, { responseType: 'blob' }).subscribe(blob => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Equipos-${eventName}-${date}.xlsx`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 5000);
    });
  }
}
