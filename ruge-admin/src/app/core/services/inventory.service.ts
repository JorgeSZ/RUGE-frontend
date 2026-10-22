import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { EventInventoryItem, EventInventoryItemInput, EventInventoryOption, InventoryItem, InventoryItemInput } from '../models/inventory.model';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  constructor(private api: ApiService) {}

  getAll(): Observable<InventoryItem[]> {
    return this.api.get<InventoryItem[]>('/inventory');
  }

  create(data: InventoryItemInput): Observable<InventoryItem> {
    return this.api.post<InventoryItem>('/inventory', data);
  }

  update(id: string, data: InventoryItemInput): Observable<InventoryItem> {
    return this.api.put<InventoryItem>(`/inventory/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/inventory/${id}`);
  }

  getEventItems(eventId: string): Observable<EventInventoryItem[]> {
    return this.api.get<EventInventoryItem[]>(`/events/${eventId}/inventory`);
  }

  getAvailableEventItems(): Observable<EventInventoryOption[]> {
    return this.api.get<EventInventoryOption[]>('/inventory/event-options');
  }

  addToEvent(eventId: string, data: EventInventoryItemInput): Observable<EventInventoryItem> {
    return this.api.post<EventInventoryItem>(`/events/${eventId}/inventory`, data);
  }

  markReturned(eventId: string, movementId: string, fechaDevolucion: string): Observable<void> {
    return this.api.patch<void>(`/events/${eventId}/inventory/${movementId}/return`, { fechaDevolucion });
  }
}
