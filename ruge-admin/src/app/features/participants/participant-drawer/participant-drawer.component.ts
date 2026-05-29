import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { Participant } from '../../../core/models/participant.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-participant-drawer',
  templateUrl: './participant-drawer.component.html',
  styleUrls: ['./participant-drawer.component.css'],
  standalone: false
})
export class ParticipantDrawerComponent {
  @Input() participant: Participant | null = null;
  @Input() isOpen = false;
  @Output() closed        = new EventEmitter<void>();
  @Output() editRequested = new EventEmitter<Participant>();
  @Output() deleteRequested = new EventEmitter<string>();

  @HostListener('document:keydown.escape')
  onEscape() { if (this.isOpen) this.closed.emit(); }

  close() { this.closed.emit(); }

  onEdit() {
    if (this.participant) this.editRequested.emit(this.participant);
  }

  onDelete() {
    if (this.participant) this.deleteRequested.emit(this.participant.id);
  }

  formatDate(d: string | undefined): string {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatDateTime(d: string | undefined): string {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleString('es-CR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  getPdfUrl(): string {
    const p = this.participant;
    return p?.qrCode ? `${environment.r2PublicUrl}/pdfs/${p.eventId}/${p.qrCode}.pdf` : '';
  }

  getComprobanteUrl(): string {
    const p = this.participant;
    if (!p?.comprobantePagoPath) return '';
    if (p.comprobantePagoPath.startsWith('http')) return p.comprobantePagoPath;
    return `${environment.apiUrl.replace('/api', '')}/${p.comprobantePagoPath}`;
  }
}
