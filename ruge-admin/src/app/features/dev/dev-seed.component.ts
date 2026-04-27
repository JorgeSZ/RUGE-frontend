import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface SeedResult {
  mensaje: string;
  eventos: number;
  senderistas: number;
  servidores: number;
  tribus: number;
  itemsLogistica: number;
  tareasEvento: number;
  tiempoMs: number;
}

@Component({
  selector: 'app-dev-seed',
  templateUrl: './dev-seed.component.html',
  styleUrls: ['./dev-seed.component.css'],
  standalone: false
})
export class DevSeedComponent {
  readonly isProd = environment.production;
  state: 'idle' | 'confirming' | 'loading' | 'done' | 'error' = 'idle';
  result: SeedResult | null = null;
  errorMsg = '';

  constructor(private http: HttpClient) {}

  askConfirm(): void { this.state = 'confirming'; }
  cancel(): void { this.state = 'idle'; }

  runSeed(): void {
    this.state = 'loading';
    this.result = null;
    this.errorMsg = '';

    this.http.post<SeedResult>(`${environment.apiUrl}/dev/seed`, {}).subscribe({
      next: res => { this.result = res; this.state = 'done'; },
      error: err => {
        this.errorMsg = err?.error?.error ?? 'Error inesperado al hacer seed.';
        this.state = 'error';
      }
    });
  }

  reset(): void { this.state = 'idle'; this.result = null; }
}
