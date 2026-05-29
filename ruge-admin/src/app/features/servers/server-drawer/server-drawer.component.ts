import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { Server } from '../../../core/models/server.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-server-drawer',
  templateUrl: './server-drawer.component.html',
  styleUrls: ['./server-drawer.component.css'],
  standalone: false
})
export class ServerDrawerComponent {
  @Input() server: Server | null = null;
  @Input() isOpen = false;
  @Output() closed          = new EventEmitter<void>();
  @Output() editRequested   = new EventEmitter<Server>();
  @Output() deleteRequested = new EventEmitter<string>();
  @Output() approveRequested = new EventEmitter<Server>();
  @Output() denyRequested    = new EventEmitter<Server>();

  @HostListener('document:keydown.escape')
  onEscape() { if (this.isOpen) this.closed.emit(); }

  close() { this.closed.emit(); }
  onEdit()   { if (this.server) this.editRequested.emit(this.server); }
  onDelete() { if (this.server) this.deleteRequested.emit(this.server.id); }
  onApprove() { if (this.server) this.approveRequested.emit(this.server); }
  onDeny()    { if (this.server) this.denyRequested.emit(this.server); }

  formatDate(d: string | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatDateTime(d: string | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleString('es-CR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  getPdfUrl(): string {
    const s = this.server;
    return s?.qrCode ? `${environment.r2PublicUrl}/pdfs/${s.eventId}/${s.qrCode}.pdf` : '';
  }

  getComprobanteUrl(): string {
    const s = this.server;
    if (!s?.comprobantePagoPath) return '';
    if (s.comprobantePagoPath.startsWith('http')) return s.comprobantePagoPath;
    return `${environment.apiUrl.replace('/api', '')}/${s.comprobantePagoPath}`;
  }

  get approvalLabel(): string {
    const map: Record<string, string> = { Aprobado: '✅ Aprobado', Pendiente: '⏳ Pendiente', Denegado: '❌ Denegado' };
    return map[this.server?.approvalStatus ?? ''] ?? '—';
  }

  get approvalClass(): string {
    const map: Record<string, string> = { Aprobado: 'badge-ok', Pendiente: 'badge-approval-pending', Denegado: 'badge-denied' };
    return map[this.server?.approvalStatus ?? ''] ?? '';
  }
}
