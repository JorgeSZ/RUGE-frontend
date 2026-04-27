import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CheckInService, CheckInListItem, CheckInSummaryResponse } from '../../core/services/checkin.service';
import { EventContextService } from '../../core/services/event-context.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-checkin-admin',
  templateUrl: './checkin-admin.component.html',
  styleUrls: ['./checkin-admin.component.css'],
  standalone: false
})
export class CheckinAdminComponent implements OnInit, OnDestroy {
  summary: CheckInSummaryResponse | null = null;
  allItems: CheckInListItem[] = [];
  loading = false;
  summaryLoading = false;

  activeTab: 'Senderista' | 'Servidor' = 'Senderista';
  estadoFilter: '' | 'Realizado' | 'Pendiente' = '';
  searchQuery = '';

  manualTarget: CheckInListItem | null = null;
  manualLoading = false;
  copied = false;

  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any;
  private pollTimer: any;

  constructor(
    public eventCtx: EventContextService,
    private checkInService: CheckInService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.eventCtx.activeEvent) {
      this.loadAll();
      this.pollTimer = setInterval(() => this.loadSummary(), 30000);
    }
  }

  ngOnDestroy(): void {
    clearInterval(this.pollTimer);
    clearTimeout(this.toastTimer);
  }

  get eventId(): string { return this.eventCtx.activeEvent!.id; }

  get checkinUrl(): string {
    return `${environment.baseUrl}/checkin/${this.eventId}`;
  }

  copyUrl(): void {
    navigator.clipboard.writeText(this.checkinUrl).then(() => {
      this.copied = true;
      setTimeout(() => { this.copied = false; this.cdr.detectChanges(); }, 2000);
    });
  }

  get filteredItems(): CheckInListItem[] {
    return this.allItems.filter(item => {
      if (item.tipo !== this.activeTab) return false;
      if (this.estadoFilter === 'Realizado' && !item.checkInRealizado) return false;
      if (this.estadoFilter === 'Pendiente' && item.checkInRealizado) return false;
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        return item.fullName.toLowerCase().includes(q) ||
               (item.cedula ?? '').toLowerCase().includes(q);
      }
      return true;
    });
  }

  get senderistas(): CheckInListItem[] {
    return this.allItems.filter(i => i.tipo === 'Senderista');
  }

  get servidores(): CheckInListItem[] {
    return this.allItems.filter(i => i.tipo === 'Servidor');
  }

  loadAll(): void {
    this.loadSummary();
    this.loadList();
  }

  loadSummary(): void {
    this.summaryLoading = true;
    this.checkInService.getSummary(this.eventId).subscribe({
      next: s => { this.summary = s; this.summaryLoading = false; this.cdr.detectChanges(); },
      error: () => { this.summaryLoading = false; this.cdr.detectChanges(); }
    });
  }

  loadList(): void {
    this.loading = true;
    this.checkInService.getList(this.eventId).subscribe({
      next: items => { this.allItems = items; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  setTab(tab: 'Senderista' | 'Servidor'): void {
    this.activeTab = tab;
    this.estadoFilter = '';
    this.searchQuery = '';
  }

  openManual(item: CheckInListItem): void {
    this.manualTarget = item;
  }

  cancelManual(): void {
    this.manualTarget = null;
  }

  confirmManual(): void {
    if (!this.manualTarget) return;
    this.manualLoading = true;
    const target = this.manualTarget;
    this.checkInService.manualCheckIn(this.eventId, target.tipo, target.id).subscribe({
      next: () => {
        this.manualLoading = false;
        this.manualTarget = null;
        this.loadAll();
        this.showToast(`Check-in manual registrado para ${target.fullName}.`, 'success');
        this.cdr.detectChanges();
      },
      error: () => {
        this.manualLoading = false;
        this.showToast('Error al registrar check-in manual.', 'error');
        this.cdr.detectChanges();
      }
    });
  }

  formatTime(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  }

  progressSenderistas(): number {
    if (!this.summary || this.summary.totalSenderistas === 0) return 0;
    return Math.round(this.summary.senderistasCheckIn / this.summary.totalSenderistas * 100);
  }

  progressServidores(): number {
    if (!this.summary || this.summary.totalServidores === 0) return 0;
    return Math.round(this.summary.servidoresCheckIn / this.summary.totalServidores * 100);
  }

  exportCsv(): void {
    const items = this.filteredItems;
    const headers = ['Nombre', 'Cédula', 'Iglesia', 'Grupo', 'Tipo', 'Check-In', 'Hora'];
    const rows = items.map(i => [
      i.fullName,
      i.cedula ?? '',
      i.iglesia ?? '',
      i.grupoAsignado ?? '',
      i.tipo,
      i.checkInRealizado ? 'Realizado' : 'Pendiente',
      i.checkInRealizado ? this.formatTime(i.fechaCheckIn) : ''
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `checkin-${this.activeTab.toLowerCase()}-${this.eventId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  showToast(message: string, type: 'success' | 'error'): void {
    clearTimeout(this.toastTimer);
    this.toast = { message, type };
    this.toastTimer = setTimeout(() => { this.toast = null; this.cdr.detectChanges(); }, 4000);
  }
}
