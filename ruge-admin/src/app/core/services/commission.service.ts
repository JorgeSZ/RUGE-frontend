import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Commission, CreateCommissionRequest } from '../models/commission.model';
import { Server } from '../models/server.model';

@Injectable({ providedIn: 'root' })
export class CommissionService {
  constructor(private api: ApiService) {}

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
}
