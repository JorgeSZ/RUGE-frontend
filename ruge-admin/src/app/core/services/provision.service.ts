import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ProvisionItem, ProvisionReport } from '../models/provision.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProvisionService {
  constructor(private api: ApiService, private http: HttpClient) {}

  getAll(): Observable<ProvisionItem[]> {
    return this.api.get<ProvisionItem[]>('/provision');
  }

  create(data: { nombre: string; cantidadPorPersona: number; unidad: string }): Observable<ProvisionItem> {
    return this.api.post<ProvisionItem>('/provision', data);
  }

  update(id: string, data: { nombre: string; cantidadPorPersona: number; unidad: string }): Observable<ProvisionItem> {
    return this.api.put<ProvisionItem>(`/provision/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/provision/${id}`);
  }

  reorder(id: string, orden: number): Observable<void> {
    return this.api.patch<void>(`/provision/${id}/reorder`, { orden });
  }

  getReport(eventId: string): Observable<ProvisionReport> {
    return this.api.get<ProvisionReport>(`/events/${eventId}/reports/provision`);
  }

  exportExcel(eventId: string, eventName: string): void {
    const url = `${environment.apiUrl}/events/${eventId}/reports/provision/export`;
    const date = new Date().toISOString().substring(0, 10);
    this.http.get(url, { responseType: 'blob' }).subscribe(blob => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `provision-${eventName}-${date}.xlsx`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 5000);
    });
  }
}
