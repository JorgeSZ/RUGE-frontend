import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface QrCheckInResponse {
  id: string;
  fullName: string;
  firstName: string;
  firstLastName: string;
  secondLastName?: string;
  tipo: string;
  iglesia?: string;
  comision?: string;
  fotoComprobante?: string;
  alreadyCheckedIn: boolean;
  fechaCheckIn?: string;
}

export interface CheckInRecentItem {
  fullName: string;
  tipo: string;
  fechaCheckIn: string;
}

export interface CheckInSummaryResponse {
  totalSenderistas: number;
  senderistasCheckIn: number;
  totalServidores: number;
  servidoresCheckIn: number;
  porcentajeGeneral: number;
  ultimosCheckIns: CheckInRecentItem[];
}

export interface CheckInListItem {
  id: string;
  fullName: string;
  cedula?: string;
  iglesia?: string;
  grupoAsignado?: string;
  tipo: string;
  checkInRealizado: boolean;
  fechaCheckIn?: string;
}

@Injectable({ providedIn: 'root' })
export class CheckInService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  checkIn(eventId: string, token: string): Observable<QrCheckInResponse> {
    return this.http.post<QrCheckInResponse>(
      `${this.base}/events/${eventId}/checkin`,
      { token }
    );
  }

  getSummary(eventId: string): Observable<CheckInSummaryResponse> {
    return this.http.get<CheckInSummaryResponse>(
      `${this.base}/events/${eventId}/checkin/summary`
    );
  }

  getList(eventId: string, tipo?: string, estado?: string): Observable<CheckInListItem[]> {
    let params = new HttpParams();
    if (tipo) params = params.set('tipo', tipo);
    if (estado) params = params.set('estado', estado);
    return this.http.get<CheckInListItem[]>(
      `${this.base}/events/${eventId}/checkin/list`,
      { params }
    );
  }

  manualCheckIn(eventId: string, tipo: string, id: string): Observable<QrCheckInResponse> {
    return this.http.post<QrCheckInResponse>(
      `${this.base}/events/${eventId}/checkin/${tipo}/${id}/manual`,
      {}
    );
  }
}
