import { HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { AuthInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { ChurchContextService } from '../services/church-context.service';

describe('Public event registration requests', () => {
  const auth = { getToken: () => 'admin-token', currentUser: { rol: 'GlobalAdmin' } } as unknown as AuthService;
  const church = { selectedChurchId: 'selected-church' } as ChurchContextService;

  it('uses the public event context instead of an admin session in another church', () => {
    let sent: HttpRequest<unknown> | undefined;
    const handler = { handle: (req: HttpRequest<unknown>) => { sent = req; return of(new HttpResponse()); } } as HttpHandler;
    new AuthInterceptor(auth, church).intercept(new HttpRequest('POST', '/api/public/events/other-event/registration-history/participant', { cedula: '123456789' }), handler).subscribe();
    expect(sent!.headers.has('Authorization')).toBe(false);
    expect(sent!.headers.has('X-Ruge-Church-Id')).toBe(false);
  });

  it('retains the selected church and authorization on authenticated modules', () => {
    let sent: HttpRequest<unknown> | undefined;
    const handler = { handle: (req: HttpRequest<unknown>) => { sent = req; return of(new HttpResponse()); } } as HttpHandler;
    new AuthInterceptor(auth, church).intercept(new HttpRequest('GET', '/api/events'), handler).subscribe();
    expect(sent!.headers.get('Authorization')).toBe('Bearer admin-token');
    expect(sent!.headers.get('X-Ruge-Church-Id')).toBe('selected-church');
  });
});
