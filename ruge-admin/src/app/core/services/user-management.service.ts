import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserDto } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private base = `${environment.apiUrl}/users`;
  constructor(private http: HttpClient) {}

  getAll(): Observable<UserDto[]> { return this.http.get<UserDto[]>(this.base); }

  create(req: { nombre: string; username: string; password: string; rol: string }): Observable<UserDto> {
    return this.http.post<UserDto>(this.base, req);
  }

  update(id: string, req: { nombre: string; rol: string; activo: boolean }): Observable<UserDto> {
    return this.http.put<UserDto>(`${this.base}/${id}`, req);
  }

  deactivate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  resetPassword(id: string): Observable<any> {
    return this.http.post(`${this.base}/${id}/reset-password`, {});
  }
}
