import { Injectable } from '@angular/core';
import {
  HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { ChurchContextService } from '../services/church-context.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService, private churchCtx: ChurchContextService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Public event links must use the event's church, even when an admin is signed in.
    if (req.url.includes('/public/events/')) return next.handle(req);
    const token = this.auth.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (this.auth.currentUser?.rol === 'GlobalAdmin' && this.churchCtx.selectedChurchId)
      headers['X-Ruge-Church-Id'] = this.churchCtx.selectedChurchId;
    const request = Object.keys(headers).length ? req.clone({ setHeaders: headers }) : req;

    return next.handle(request).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401 && !req.url.includes('/auth/login')) {
          this.auth.logout();
        }
        return throwError(() => err);
      })
    );
  }
}
