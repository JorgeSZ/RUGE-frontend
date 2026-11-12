import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home-redirect',
  template: '<div class="loading">Abriendo RUGE...</div>',
  standalone: false
})
export class HomeRedirectComponent implements OnInit {
  constructor(private auth: AuthService) {}
  ngOnInit(): void { this.auth.navigateToHome(); }
}
