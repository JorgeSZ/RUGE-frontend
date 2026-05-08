import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApprovalInfo {
  nombreCompleto: string;
  iglesia?: string;
  comision?: string;
  nombreEvento: string;
  currentStatus: 'Pendiente' | 'Aprobado' | 'Denegado';
  alreadyProcessed: boolean;
}

export interface ApprovalResult {
  success: boolean;
  action: string;
  nombreServidor: string;
  nombreEvento: string;
}

@Injectable({ providedIn: 'root' })
export class ApprovalService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getInfo(token: string): Observable<ApprovalInfo> {
    return this.http.get<ApprovalInfo>(`${this.base}/public/approval/${token}`);
  }

  process(token: string, action: 'approve' | 'deny'): Observable<ApprovalResult> {
    return this.http.post<ApprovalResult>(`${this.base}/public/approval/${token}`, { action });
  }

  approveServer(eventId: string, serverId: string): Observable<any> {
    return this.http.post(`${this.base}/events/${eventId}/servers/${serverId}/approve`, {});
  }

  denyServer(eventId: string, serverId: string): Observable<any> {
    return this.http.post(`${this.base}/events/${eventId}/servers/${serverId}/deny`, {});
  }
}
