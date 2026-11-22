import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { ConsolidationNote, CreateConsolidationNote } from '../models/consolidation-note.model';
export interface CrmPerson {
  id: string; firstName: string; firstLastName?: string; secondLastName?: string;
  cedula?: string; legacyNumber?: string; phone?: string; email?: string; birthDate?: string;
  church?: string; country?: string; maritalStatus?: string; shirtSize?: string;
  spouseName?: string; spousePhone?: string; emergencyContactName?: string; emergencyContactPhone?: string;
  d12Patch?: boolean | null; events?: string[]; notesCount?: number;
}
export interface CrmAttendance { id: string; eventName: string; eventDate?: string; tribeName?: string; origin: string; }
export interface CrmWrite extends Partial<Omit<CrmPerson, 'id' | 'events' | 'notesCount'>> { firstName: string; eventName?: string; eventDate?: string; }
export interface CrmPage { items: CrmPerson[]; total: number; page: number; pageSize: number; }
@Injectable({ providedIn: 'root' })
export class CrmService {
  constructor(private api: ApiService) {}
  list(query: { search: string; eventName: string; origin: string; missingIdentity: boolean; page: number; pageSize: number }) {
    const params = new URLSearchParams(Object.entries(query).map(([k,v]) => [k, String(v)]));
    return this.api.get<CrmPage>(`/crm?${params}`);
  }
  filters() { return this.api.get<{ events: string[]; origins: string[] }>('/crm/filters'); }
  get(id: string) { return this.api.get<{ person: CrmPerson; attendances: CrmAttendance[] }>(`/crm/${id}`); }
  create(data: CrmWrite) { return this.api.post<{ id: string }>('/crm', data); }
  update(id: string, data: CrmWrite) { return this.api.put<void>(`/crm/${id}`, data); }
  notes(id: string) { return this.api.get<ConsolidationNote[]>(`/crm/${id}/notes`); }
  addNote(id: string, note: CreateConsolidationNote) { return this.api.post<ConsolidationNote>(`/crm/${id}/notes`, note); }
}
