import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { EventTeachingsResponse, EventTeaching, TeachingAssignment, TeachingServerOption } from '../../core/models/teaching.model';
import { EventContextService } from '../../core/services/event-context.service';
import { TeachingService } from '../../core/services/teaching.service';
import { searchText } from '../global-management/global-management.utils';

@Component({
  selector: 'app-event-teachings',
  templateUrl: './event-teachings.component.html',
  styleUrls: ['../global-management/global-management.css', './event-teachings.component.css'],
  standalone: false
})
export class EventTeachingsComponent implements OnInit {
  response: EventTeachingsResponse | null = null;
  loading = false;
  busyTeachingId: string | null = null;
  pdfLoadingId: string | null = null;
  error = '';
  success = '';
  readonly eventId: string | null;
  serverSearch: Record<string, string> = {};
  selectedServerIds: Record<string, string> = {};
  serverOptions: Record<string, TeachingServerOption[]> = {};
  openServerTeachingId: string | null = null;
  activeServerIndex = -1;
  search = ''; status = 'all'; page = 1; readonly pageSize = 10;
  expandedTeachingId: string | null = null;
  private serversById = new Map<string, TeachingServerOption>();
  private serverIndex: { server: TeachingServerOption; name: string }[] = [];

  constructor(
    private route: ActivatedRoute,
    private eventContext: EventContextService,
    private teachingsApi: TeachingService,
    private cdr: ChangeDetectorRef
  ) {
    this.eventId = this.route.snapshot.paramMap.get('eventId') || this.eventContext.activeEvent?.id || null;
  }

  ngOnInit(): void { this.load(); }

  get teachings(): EventTeaching[] { return this.response?.teachings || []; }
  get servers() { return this.response?.servers || []; }
  get archived(): boolean { return this.response?.isArchived || false; }
  get assignedCount(): number { return this.teachings.filter(t => !!t.currentAssignment).length; }
  get pendingCount(): number { return this.teachings.filter(t => t.isActive && !t.currentAssignment).length; }
  get filteredTeachings(): EventTeaching[] {
    const words = searchText(this.search).split(' ').filter(Boolean);
    return this.teachings.filter(t => (this.status === 'all' || this.status === 'assigned' && !!t.currentAssignment ||
      this.status === 'pending' && t.isActive && !t.currentAssignment) &&
      words.every(w => searchText(`${t.name} ${t.currentAssignment?.serverName ?? ''} ${t.currentAssignment?.serverEmail ?? ''}`).includes(w)));
  }
  get pageCount(): number { return Math.max(1, Math.ceil(this.filteredTeachings.length / this.pageSize)); }
  get visibleTeachings(): EventTeaching[] { return this.filteredTeachings.slice((this.page - 1) * this.pageSize, this.page * this.pageSize); }
  resetFilters(): void { this.search = ''; this.status = 'all'; this.page = 1; }
  toggleDetails(item: EventTeaching): void {
    if (this.busyTeachingId) return;
    this.openServerTeachingId = null;
    this.expandedTeachingId = this.expandedTeachingId === item.id ? null : item.id;
  }

  load(): void {
    if (!this.eventId) {
      this.error = 'No hay un reto seleccionado.';
      return;
    }
    this.loading = true;
    this.error = '';
    this.teachingsApi.listForEvent(this.eventId).pipe(finalize(() => {
      this.loading = false;
      this.cdr.markForCheck();
    })).subscribe({
      next: data => {
        this.response = { ...data, teachings: [...data.teachings].sort((a, b) => a.name.localeCompare(b.name, 'es')) };
        this.page = Math.min(this.page, this.pageCount);
        this.openServerTeachingId = null;
        this.serversById = new Map(data.servers.map(server => [server.id, server]));
        this.serverIndex = data.servers.map(server => ({ server, name: this.normalizeName(server.name) }));
        const searches: Record<string, string> = {};
        const selections: Record<string, string> = {};
        const options: Record<string, TeachingServerOption[]> = {};
        for (const teaching of data.teachings) {
          const query = this.serverSearch[teaching.id] ?? '';
          searches[teaching.id] = query;
          options[teaching.id] = this.matchingServers(query);
          const selected = this.selectedServerIds[teaching.id] ?? teaching.currentAssignment?.serverId ?? '';
          selections[teaching.id] = options[teaching.id].some(server => server.id === selected && server.email)
            ? selected : '';
        }
        this.serverSearch = searches;
        this.selectedServerIds = selections;
        this.serverOptions = options;
      },
      error: err => { this.error = err?.error?.error || 'No se pudieron cargar las enseñanzas del reto.'; }
    });
  }

  assign(item: EventTeaching, serverId: string): void {
    if (!this.eventId || !serverId || this.archived || this.busyTeachingId) return;
    if (!item.isActive || !item.hasPdf || !this.servers.some(server => server.id === serverId && server.email)) return;
    this.busyTeachingId = item.id;
    this.error = '';
    this.success = '';
    this.teachingsApi.assign(this.eventId, item.id, serverId)
      .pipe(finalize(() => {
        this.busyTeachingId = null;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: assigned => {
          this.success = `La enseñanza se asignó a ${assigned.serverName}. Se envió el PDF a su correo.`;
          delete this.serverSearch[item.id];
          delete this.selectedServerIds[item.id];
          this.load();
        },
        error: err => { this.error = err?.error?.error || 'No se pudo asignar la enseñanza.'; }
      });
  }

  searchServers(teachingId: string, query: string): void {
    this.serverSearch[teachingId] = query;
    this.serverOptions[teachingId] = this.matchingServers(query);
    // Searching never selects a recipient automatically or keeps a hidden selection.
    this.selectedServerIds[teachingId] = '';
    this.openServerTeachingId = teachingId;
    this.activeServerIndex = -1;
  }

  serverInputValue(teachingId: string): string {
    return this.serversById.get(this.selectedServerIds[teachingId])?.name ?? this.serverSearch[teachingId] ?? '';
  }

  openServerPicker(teachingId: string, event?: FocusEvent): void {
    if (this.busyTeachingId) return;
    if (this.openServerTeachingId !== teachingId) {
      this.openServerTeachingId = teachingId;
      this.activeServerIndex = -1;
      this.serverOptions[teachingId] = this.matchingServers(this.selectedServerIds[teachingId] ? '' : this.serverSearch[teachingId] ?? '');
    }
    if (event && this.selectedServerIds[teachingId]) (event.target as HTMLInputElement).select();
  }

  closeServerPicker(teachingId: string): void {
    if (this.openServerTeachingId === teachingId) {
      this.openServerTeachingId = null;
      this.activeServerIndex = -1;
    }
  }

  selectServer(teachingId: string, server: TeachingServerOption): void {
    if (!server.email || this.busyTeachingId) return;
    this.selectedServerIds[teachingId] = server.id;
    this.serverSearch[teachingId] = '';
    this.closeServerPicker(teachingId);
  }

  serverKeydown(teachingId: string, event: KeyboardEvent): void {
    if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape' && this.openServerTeachingId === teachingId) event.preventDefault();
      this.closeServerPicker(teachingId);
      return;
    }
    if (event.key === 'Enter' && this.openServerTeachingId === teachingId) {
      event.preventDefault();
      const server = this.serverOptions[teachingId]?.[this.activeServerIndex];
      if (server) this.selectServer(teachingId, server);
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    this.openServerPicker(teachingId);
    const options = this.serverOptions[teachingId] ?? [];
    const step = event.key === 'ArrowDown' ? 1 : -1;
    let index = this.activeServerIndex;
    if (index === -1 && step === -1) index = options.length;
    for (index += step; index >= 0 && index < options.length; index += step) {
      if (options[index].email) {
        this.activeServerIndex = index;
        this.cdr.detectChanges();
        document.getElementById(`server-option-${teachingId}-${index}`)?.scrollIntoView?.({ block: 'nearest' });
        break;
      }
    }
  }

  private matchingServers(query: string): TeachingServerOption[] {
    const terms = this.normalizeName(query).split(/\s+/).filter(Boolean);
    return this.serverIndex.filter(entry => terms.every(term => entry.name.includes(term)))
      .map(entry => entry.server);
  }

  private normalizeName(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  openPdf(item: EventTeaching): void {
    if (!this.eventId) return;
    const popup = window.open('about:blank', '_blank');
    this.pdfLoadingId = item.id;
    const assignment = item.currentAssignment;
    const request = assignment
      ? this.teachingsApi.assignedPdf(this.eventId, assignment.id)
      : this.teachingsApi.previewForEvent(this.eventId, item.id);
    request.pipe(finalize(() => {
      this.pdfLoadingId = null;
      this.cdr.markForCheck();
    })).subscribe({
      next: blob => this.openBlob(blob, popup),
      error: err => { popup?.close(); this.error = err?.error?.error || 'No se pudo abrir el PDF de la enseñanza.'; }
    });
  }

  openSavedAssignment(assignment: TeachingAssignment): void {
    if (!this.eventId) return;
    const popup = window.open('about:blank', '_blank');
    this.pdfLoadingId = assignment.globalTeachingId;
    this.teachingsApi.assignedPdf(this.eventId, assignment.id)
      .pipe(finalize(() => {
        this.pdfLoadingId = null;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: blob => this.openBlob(blob, popup),
        error: err => { popup?.close(); this.error = err?.error?.error || 'No se pudo abrir la copia guardada.'; }
      });
  }

  previousAssignments(item: EventTeaching): TeachingAssignment[] {
    return item.assignmentHistory.filter(row => !row.isCurrent);
  }

  private openBlob(blob: Blob, popup: Window | null): void {
    const url = URL.createObjectURL(blob);
    if (popup) {
      popup.opener = null;
      popup.location.href = url;
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ensenanza-ruge.pdf';
      link.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
