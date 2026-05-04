import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Menu, MenuIngrediente, CenaDelReyReport } from '../models/menu.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MenuService {
  constructor(private api: ApiService, private http: HttpClient) {}

  getAll(): Observable<Menu[]> {
    return this.api.get<Menu[]>('/menus');
  }

  getById(id: string): Observable<Menu> {
    return this.api.get<Menu>(`/menus/${id}`);
  }

  create(data: { nombre: string; descripcion?: string }): Observable<Menu> {
    return this.api.post<Menu>('/menus', data);
  }

  update(id: string, data: { nombre: string; descripcion?: string }): Observable<Menu> {
    return this.api.put<Menu>(`/menus/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/menus/${id}`);
  }

  reorder(id: string, orden: number): Observable<void> {
    return this.api.patch<void>(`/menus/${id}/reorder`, { orden });
  }

  addIngrediente(menuId: string, data: Partial<MenuIngrediente>): Observable<MenuIngrediente> {
    return this.api.post<MenuIngrediente>(`/menus/${menuId}/ingredients`, data);
  }

  updateIngrediente(menuId: string, id: string, data: Partial<MenuIngrediente>): Observable<MenuIngrediente> {
    return this.api.put<MenuIngrediente>(`/menus/${menuId}/ingredients/${id}`, data);
  }

  deleteIngrediente(menuId: string, id: string): Observable<void> {
    return this.api.delete<void>(`/menus/${menuId}/ingredients/${id}`);
  }

  reorderIngrediente(menuId: string, id: string, orden: number): Observable<void> {
    return this.api.patch<void>(`/menus/${menuId}/ingredients/${id}/reorder`, { orden });
  }

  getReport(eventId: string): Observable<CenaDelReyReport> {
    return this.api.get<CenaDelReyReport>(`/events/${eventId}/reports/cena-del-rey`);
  }

  exportExcel(eventId: string, eventName: string): void {
    const url = `${environment.apiUrl}/events/${eventId}/reports/cena-del-rey/export`;
    const date = new Date().toISOString().substring(0, 10);
    this.http.get(url, { responseType: 'blob' }).subscribe(blob => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `cena-del-rey-${eventName}-${date}.xlsx`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 5000);
    });
  }
}
