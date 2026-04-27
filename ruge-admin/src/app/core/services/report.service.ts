import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ShirtSizeReport, ParticipantsByTribeReport, ServersByCommissionReport,
  ShirtListResponse, ShirtSummaryResponse, DiscipleshipPatchResponse
} from '../models/report.model';

@Injectable({ providedIn: 'root' })
export class ReportService {
  constructor(private http: HttpClient) {}

  private base(eventId: string) { return `${environment.apiUrl}/events/${eventId}/reports`; }

  // ── Legacy ────────────────────────────────────────────────────────────────
  getShirtSizes(eventId: string): Observable<any> {
    return this.http.get(`${this.base(eventId)}/shirt-sizes`);
  }
  getParticipantsByTribe(eventId: string): Observable<any> {
    return this.http.get(`${this.base(eventId)}/participants-by-tribe`);
  }
  getServersByCommission(eventId: string): Observable<any> {
    return this.http.get(`${this.base(eventId)}/servers-by-commission`);
  }

  // ── New JSON ──────────────────────────────────────────────────────────────
  getShirtList(eventId: string): Observable<ShirtListResponse> {
    return this.http.get<ShirtListResponse>(`${this.base(eventId)}/shirt-list`);
  }
  getShirtSummary(eventId: string): Observable<ShirtSummaryResponse> {
    return this.http.get<ShirtSummaryResponse>(`${this.base(eventId)}/shirt-summary`);
  }
  getDiscipleshipPatches(eventId: string): Observable<DiscipleshipPatchResponse> {
    return this.http.get<DiscipleshipPatchResponse>(`${this.base(eventId)}/discipleship-patches`);
  }

  // ── Excel downloads ───────────────────────────────────────────────────────
  downloadExcel(url: string, filename: string): void {
    this.http.get(url, { responseType: 'blob' }).subscribe(blob => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 5000);
    });
  }

  exportShirtList(eventId: string, eventName: string): void {
    const date = new Date().toISOString().substring(0, 10);
    this.downloadExcel(`${this.base(eventId)}/shirt-list/export`, `camisas-${eventName}-${date}.xlsx`);
  }

  exportShirtSummary(eventId: string, eventName: string): void {
    const date = new Date().toISOString().substring(0, 10);
    this.downloadExcel(`${this.base(eventId)}/shirt-summary/export`, `resumen-camisas-${eventName}-${date}.xlsx`);
  }

  exportDiscipleshipPatches(eventId: string, eventName: string): void {
    const date = new Date().toISOString().substring(0, 10);
    this.downloadExcel(`${this.base(eventId)}/discipleship-patches/export`, `parches-${eventName}-${date}.xlsx`);
  }
}
