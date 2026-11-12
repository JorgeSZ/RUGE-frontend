import { DialogService } from '../../core/services/dialog.service';
import { inject, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Teaching, TeachingSaveRequest } from '../../core/models/teaching.model';
import { TeachingService } from '../../core/services/teaching.service';
import { searchText } from '../global-management/global-management.utils';

@Component({
  selector: 'app-teachings-admin',
  templateUrl: './teachings-admin.component.html',
  styleUrls: ['../global-management/global-management.css', './teachings-admin.component.css'],
  standalone: false
})
export class TeachingsAdminComponent implements OnInit {
  private readonly dialogs = inject(DialogService);
  teachings: Teaching[] = [];
  loading = false;
  saving = false;
  pdfLoadingId: string | null = null;
  deletingId: string | null = null;
  showEditor = false;
  editing: Teaching | null = null;
  active = true;
  name = '';
  objectives = '';
  generalMessage = '';
  selectedPdf: File | null = null;
  error = '';
  success = '';
  private editorSession = 0;
  search = ''; status = 'all'; page = 1; readonly pageSize = 10;
  expandedTeachingId: string | null = null;
  togglingId: string | null = null;

  constructor(private teachingsApi: TeachingService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void { this.load(); }

  get activeCount(): number { return this.teachings.filter(item => item.isActive).length; }
  get filteredTeachings(): Teaching[] {
    const words = searchText(this.search).split(' ').filter(Boolean);
    return this.teachings.filter(t => (this.status === 'all' || t.isActive === (this.status === 'active')) &&
      words.every(w => searchText(`${t.name} ${t.generalMessage} ${t.objectives} ${t.pdfFileName ?? ''}`).includes(w)));
  }
  get pageCount(): number { return Math.max(1, Math.ceil(this.filteredTeachings.length / this.pageSize)); }
  get visibleTeachings(): Teaching[] { return this.filteredTeachings.slice((this.page - 1) * this.pageSize, this.page * this.pageSize); }
  resetFilters(): void { this.search = ''; this.status = 'all'; this.page = 1; }

  load(): void {
    this.loading = true;
    this.error = '';
    this.teachingsApi.listGlobal().pipe(finalize(() => {
      this.loading = false;
      this.cdr.markForCheck();
    })).subscribe({
      next: rows => {
        this.teachings = [...rows].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name, 'es'));
        this.page = Math.min(this.page, this.pageCount);
      },
      error: err => { this.error = err?.error?.error || 'No se pudieron cargar las enseñanzas.'; }
    });
  }

  openCreate(): void {
    this.editorSession++;
    this.editing = null;
    this.name = '';
    this.objectives = '';
    this.generalMessage = '';
    this.selectedPdf = null;
    this.active = true;
    this.error = '';
    this.showEditor = true;
  }

  openEdit(item: Teaching): void {
    this.editorSession++;
    this.editing = item;
    this.name = item.name;
    this.objectives = item.objectives;
    this.generalMessage = item.generalMessage;
    this.selectedPdf = null;
    this.active = item.isActive;
    this.error = '';
    this.showEditor = true;
  }

  closeEditor(): void {
    this.editorSession++;
    this.showEditor = false;
  }

  onPdfSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.error = '';
    if (file && ((file.type && file.type !== 'application/pdf') || !file.name.toLowerCase().endsWith('.pdf'))) {
      this.error = 'Selecciona un archivo PDF válido.';
      input.value = '';
      this.selectedPdf = null;
      return;
    }
    if (file && file.size > 25 * 1024 * 1024) {
      this.error = 'El PDF no puede superar los 25 MB.';
      input.value = '';
      this.selectedPdf = null;
      return;
    }
    this.selectedPdf = file;
  }

  save(): void {
    const request: TeachingSaveRequest = {
      name: this.name.trim(),
      objectives: this.objectives.trim(),
      generalMessage: this.generalMessage.trim(),
      pdfFile: this.selectedPdf,
      isActive: this.active
    };
    if (!request.name || (!request.pdfFile && !this.editing?.hasPdf) || this.saving) {
      this.error = 'Completa el nombre y adjunta el PDF de la enseñanza.';
      return;
    }
    this.saving = true;
    this.error = '';
    const session = this.editorSession;
    const action = this.editing
      ? this.teachingsApi.update(this.editing.id, request)
      : this.teachingsApi.create(request);
    let receivedResponse = false;
    action.pipe(
      timeout({ first: 120000 }),
      finalize(() => {
        this.saving = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: () => {
        receivedResponse = true;
        if (session !== this.editorSession) {
          this.load();
          return;
        }
        this.finishSave();
      },
      complete: () => {
        // Treat a successful empty response (for example HTTP 204) as saved too.
        if (!receivedResponse) {
          if (session !== this.editorSession) this.load();
          else this.finishSave();
        }
      },
      error: err => {
        if (err?.name === 'TimeoutError') {
          if (session !== this.editorSession) {
            this.load();
            return;
          }
          this.showEditor = false;
          this.success = 'La carga tardó demasiado en confirmar. Revisa el catálogo antes de volver a subir el PDF.';
          this.load();
          return;
        }
        this.error = err?.error?.error || 'No se pudo guardar la enseñanza.';
      }
    });
  }

  private finishSave(): void {
    this.showEditor = false;
    this.success = this.editing ? 'Enseñanza actualizada.' : 'Enseñanza creada.';
    this.load();
  }

  toggle(item: Teaching): void {
    if (this.togglingId) return;
    this.togglingId = item.id;
    const next = !item.isActive;
    this.teachingsApi.setActive(item.id, next).pipe(
      finalize(() => { this.togglingId = null; this.cdr.markForCheck(); })
    ).subscribe({
      next: updated => {
        this.teachings = this.teachings.map(row => row.id === updated.id ? updated : row)
          .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name));
        this.success = next ? 'La enseñanza quedó disponible en todas las iglesias.' : 'La enseñanza se desactivó en todas las iglesias.';
        this.page = Math.min(this.page, this.pageCount);
      },
      error: err => { this.error = err?.error?.error || 'No se pudo cambiar el estado.'; }
    });
  }

  async removeTeaching(item: Teaching): Promise<void> {
    if (this.deletingId) return;
    this.error = '';
    this.success = '';
    const confirmed = await this.dialogs.confirmAction(
      `¿Eliminar "${item.name}" del catálogo global? Las copias y el historial de los retos se conservarán.`,
      async () => {
        this.deletingId = item.id;
        this.cdr.markForCheck();
        try { await firstValueFrom(this.teachingsApi.deleteGlobal(item.id)); }
        finally { this.deletingId = null; this.cdr.markForCheck(); }
      },
      { title: 'Eliminar enseñanza', confirmText: 'Eliminar enseñanza', destructive: true }
    );
    if (confirmed) {
      void this.dialogs.success('Enseñanza eliminada. El historial de los retos se conservó.');
      this.load();
    }
    this.cdr.markForCheck();
  }

  openPdf(item: Teaching): void {
    const popup = window.open('about:blank', '_blank');
    this.pdfLoadingId = item.id;
    this.teachingsApi.globalPdf(item.id).pipe(finalize(() => {
      this.pdfLoadingId = null;
      this.cdr.markForCheck();
    })).subscribe({
      next: blob => this.openBlob(blob, popup),
      error: () => { popup?.close(); this.error = 'No se pudo preparar el PDF de esta enseñanza.'; }
    });
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
