import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    if (!this.auth.isAuthenticated()) return this.router.createUrlTree(['/login']);
    if (this.auth.currentUser?.mustChangePassword && state.url !== '/mi-perfil') {
      return this.router.createUrlTree(['/mi-perfil']);
    }
    return true;
  }
}
