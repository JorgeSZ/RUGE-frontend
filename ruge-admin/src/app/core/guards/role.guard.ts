import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ChurchContextService } from '../services/church-context.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router, private churchCtx: ChurchContextService) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    if (this.auth.currentUser?.rol === 'GlobalAdmin' &&
        !['churches', 'global-admins', 'enseñanzas-globales'].includes(route.routeConfig?.path ?? '') && !this.churchCtx.selectedChurchId)
      return this.router.createUrlTree(['/churches']);
    const roles = route.data['roles'] as string[] | undefined;
    if (!roles || this.auth.hasAnyRole(roles)) return true;
    return this.router.createUrlTree(['/unauthorized']);
  }
}
