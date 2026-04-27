import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EvTaskDto,
  EvTaskSegmentDetailResponse,
  EvTaskOverviewResponse,
} from '../models/ev-task.model';

@Injectable({ providedIn: 'root' })
export class EvTaskService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getOverview(eventId: string): Observable<EvTaskOverviewResponse> {
    return this.http.get<EvTaskOverviewResponse>(
      `${this.base}/events/${eventId}/evtasks/overview`
    );
  }

  getBySegment(eventId: string, segmentId: string): Observable<EvTaskSegmentDetailResponse> {
    return this.http.get<EvTaskSegmentDetailResponse>(
      `${this.base}/events/${eventId}/segments/${segmentId}/evtasks`
    );
  }

  create(eventId: string, segmentId: string, req: {
    nombre: string; descripcion?: string; responsable?: string; esObligatorio: boolean;
  }): Observable<EvTaskDto> {
    return this.http.post<EvTaskDto>(
      `${this.base}/events/${eventId}/segments/${segmentId}/evtasks`, req
    );
  }

  update(eventId: string, taskId: string, req: {
    nombre: string; descripcion?: string; responsable?: string; esObligatorio: boolean;
  }): Observable<EvTaskDto> {
    return this.http.put<EvTaskDto>(
      `${this.base}/events/${eventId}/evtasks/${taskId}`, req
    );
  }

  delete(eventId: string, taskId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/events/${eventId}/evtasks/${taskId}`);
  }

  reorder(eventId: string, taskId: string, orden: number): Observable<void> {
    return this.http.patch<void>(
      `${this.base}/events/${eventId}/evtasks/${taskId}/reorder`, { orden }
    );
  }

  updateStatus(eventId: string, taskId: string, req: {
    completado: boolean; completadoPor?: string; notas?: string;
  }): Observable<EvTaskDto> {
    return this.http.patch<EvTaskDto>(
      `${this.base}/events/${eventId}/evtasks/${taskId}/status`, req
    );
  }

  bulkImport(eventId: string, segmentId: string, tasks: Array<{
    nombre: string; descripcion?: string; responsable?: string; esObligatorio: boolean;
  }>): Observable<EvTaskDto[]> {
    return this.http.post<EvTaskDto[]>(
      `${this.base}/events/${eventId}/segments/${segmentId}/evtasks/bulk`, { tasks }
    );
  }

  exportCsvUrl(eventId: string, segmentId: string): string {
    return `${this.base}/events/${eventId}/segments/${segmentId}/evtasks/export`;
  }
}
