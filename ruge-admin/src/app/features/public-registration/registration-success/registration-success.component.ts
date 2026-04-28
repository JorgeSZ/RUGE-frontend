import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-registration-success',
  templateUrl: './registration-success.component.html',
  styleUrls: ['./registration-success.component.css'],
  standalone: false
})
export class RegistrationSuccessComponent implements OnInit {
  result: any = null;
  type = '';
  downloading = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    const nav   = this.router.getCurrentNavigation();
    const state = nav?.extras?.state ?? history.state;
    this.result = state?.['result'];
    this.type   = state?.['type'] ?? '';

    if (!this.result) {
      this.router.navigate(['/']);
    }
  }

  async downloadQr(): Promise<void> {
    if (!this.result?.qrImageUrl || this.downloading) return;
    this.downloading = true;

    try {
      const filename = this.buildFilename();
      const response = await fetch(this.result.qrImageUrl);
      const blob     = await response.blob();
      const blobUrl  = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href     = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback for environments where fetch/blob fails
      const a = document.createElement('a');
      a.href     = this.result.qrImageUrl;
      a.download = this.buildFilename();
      a.target   = '_blank';
      a.click();
    } finally {
      this.downloading = false;
    }
  }

  private buildFilename(): string {
    const full   = (this.result?.fullName ?? 'RUGE') as string;
    const parts  = full.trim().split(/\s+/);
    // Convention: first token = nombre, rest = apellidos
    const nombre    = parts[0] ?? '';
    const apellidos = parts.slice(1).join('');
    const safe      = (apellidos + nombre).replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, '');
    return `RUGE-QR-${safe || 'Participante'}.png`;
  }
}
