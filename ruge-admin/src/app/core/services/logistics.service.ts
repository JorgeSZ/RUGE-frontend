import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LogisticSegmentDetailResponse,
  LogisticOverviewResponse,
  LogisticItemDto,
  CreateLogisticItemRequest,
  UpdateLogisticItemRequest,
  UpdateLogisticStatusRequest,
} from '../models/logistic.model';

@Injectable({ providedIn: 'root' })
export class LogisticsService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // — Track-scoped (configuration) —

  getBySegment(segmentId: string): Observable<LogisticSegmentDetailResponse> {
    return this.http.get<LogisticSegmentDetailResponse>(
      `${this.base}/segments/${segmentId}/logistics`
    );
  }

  create(segmentId: string, req: CreateLogisticItemRequest): Observable<LogisticItemDto> {
    return this.http.post<LogisticItemDto>(
      `${this.base}/segments/${segmentId}/logistics`, req
    );
  }

  update(itemId: string, req: UpdateLogisticItemRequest): Observable<LogisticItemDto> {
    return this.http.put<LogisticItemDto>(
      `${this.base}/logistics/${itemId}`, req
    );
  }

  delete(itemId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/logistics/${itemId}`);
  }

  reorder(itemId: string, orden: number): Observable<void> {
    return this.http.patch<void>(`${this.base}/logistics/${itemId}/reorder`, { orden });
  }

  bulkImport(segmentId: string, items: CreateLogisticItemRequest[]): Observable<LogisticItemDto[]> {
    return this.http.post<LogisticItemDto[]>(
      `${this.base}/segments/${segmentId}/logistics/bulk`, { items }
    );
  }

  exportCsvUrl(segmentId: string): string {
    return `${this.base}/segments/${segmentId}/logistics/export`;
  }

  // — Event-scoped (execution / status) —

  getOverview(eventId: string): Observable<LogisticOverviewResponse> {
    return this.http.get<LogisticOverviewResponse>(
      `${this.base}/events/${eventId}/logistics/overview`
    );
  }

  getBySegmentForEvent(eventId: string, segmentId: string): Observable<LogisticSegmentDetailResponse> {
    return this.http.get<LogisticSegmentDetailResponse>(
      `${this.base}/events/${eventId}/segments/${segmentId}/logistics`
    );
  }

  updateStatus(eventId: string, itemId: string, req: UpdateLogisticStatusRequest): Observable<LogisticItemDto> {
    return this.http.patch<LogisticItemDto>(
      `${this.base}/events/${eventId}/logistics/${itemId}/status`, req
    );
  }
}
