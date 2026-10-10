import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

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
  downloadingGuide = false;
  readonly guideUrl = `${environment.apiUrl.replace(/\/api\/?$/, '')}/assets/guia-ruge-2026.pdf`;

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

  async downloadPdf(): Promise<void> {
    if (!this.result?.pdfUrl || this.downloading) return;
    this.downloading = true;

    try {
      await this.downloadFile(this.result.pdfUrl, this.buildPdfFilename());
    } catch {
      this.openFile(this.result.pdfUrl);
    } finally {
      this.downloading = false;
    }
  }

  async downloadGuide(): Promise<void> {
    if (this.downloadingGuide) return;
    this.downloadingGuide = true;

    try {
      await this.downloadFile(this.guideUrl, 'Guia-RUGE-2026.pdf');
    } catch {
      this.openFile(this.guideUrl);
    } finally {
      this.downloadingGuide = false;
    }
  }

  private async downloadFile(url: string, filename: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`No se pudo descargar ${filename}`);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  }

  private openFile(url: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.click();
  }

  private buildPdfFilename(): string {
    const full     = (this.result?.fullName ?? 'RUGE') as string;
    const parts    = full.trim().split(/\s+/);
    const nombre   = parts[0] ?? '';
    const apellido = parts.slice(1).join('');
    const safe     = (apellido + nombre).replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, '');
    return `RUGE-Acuerdo-${safe || 'Participante'}.pdf`;
  }
}
