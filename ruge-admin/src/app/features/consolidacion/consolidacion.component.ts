import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Subscription } from 'rxjs';
import {
  ConsolidationNote,
  CreateConsolidationNote,
} from '../../core/models/consolidation-note.model';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  inject,
} from '@angular/core';
import { ParticipantService } from '../../core/services/participant.service';
import { Participant } from '../../core/models/participant.model';
import { comparePersonNames } from '../../core/utils/person-sort';
import { ConsolidationParticipant } from '../../core/models/consolidation-participant.model';
import { searchText } from '../global-management/global-management.utils';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-consolidacion',
  templateUrl: './consolidacion.component.html',
  styleUrls: ['./consolidacion.component.css', '../list-pagination.css'],
  standalone: false,
})
export class ConsolidacionComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private notesRequest?: Subscription;
  private returnFocus: HTMLElement | null = null;
  private pendingNote: CreateConsolidationNote | null = null;
  private drafts = new Map<string, { text: string; request: CreateConsolidationNote | null }>();
  notesParticipant: ConsolidationParticipant | null = null;
  notes: ConsolidationNote[] = [];
  noteDraft = '';
  notesLoading = false;
  notesSaving = false;
  notesError = '';
  noteSaveError = '';
  noteSuccess = '';
  participants: ConsolidationParticipant[] = [];
  loadError = '';
  filterEventId = '';
  page = 1;
  pageSize = 25;
  filtered: ConsolidationParticipant[] = [];
  paged: ConsolidationParticipant[] = [];
  get pageCount(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }
  get firstResult(): number {
    return this.filtered.length ? (this.page - 1) * this.pageSize + 1 : 0;
  }
  get lastResult(): number {
    return Math.min(this.page * this.pageSize, this.filtered.length);
  }
  setPage(page: number): void {
    this.page = page;
    this.applyFilters(false);
  }
  trackParticipant(_index: number, participant: Participant): string {
    return participant.id;
  }
  events: { id: string; name: string; startDate: string }[] = [];
  tribes: { id: string; name: string; eventName: string }[] = [];
  paises: string[] = [];

  private updateFilterOptions(): void {
    this.events = [
      ...new Map(
        this.participants.map((p) => [
          p.eventId,
          { id: p.eventId, name: p.eventName, startDate: p.eventStartDate },
        ]),
      ).values(),
    ].sort((a, b) => b.startDate.localeCompare(a.startDate) || a.name.localeCompare(b.name, 'es'));
    const people = this.participants.filter(
      (p) => p.tribeId && (!this.filterEventId || p.eventId === this.filterEventId),
    );
    this.tribes = [
      ...new Map(
        people.map((p) => [
          p.tribeId!,
          { id: p.tribeId!, name: p.tribeName || 'Sin nombre', eventName: p.eventName },
        ]),
      ).values(),
    ].sort(
      (a, b) =>
        a.eventName.localeCompare(b.eventName, 'es') ||
        a.name.localeCompare(b.name, 'es', { numeric: true }),
    );
    this.paises = [
      ...new Set(this.participants.map((p) => p.country ?? '').filter(Boolean)),
    ].sort();
  }
  onEventFilterChange(): void {
    this.filterTribeId = '';
    this.applyFilters();
  }
  loading = false;
  drawerOpen = false;
  drawerParticipant: Participant | null = null;

  searchTerm = '';
  filterEdadMin: number | null = null;
  filterEdadMax: number | null = null;
  filterEstadoCivil = '';
  filterPais = '';
  filterTribeId = '';
  apiUrl = environment.apiUrl;

  readonly maritalStatuses = ['Soltero', 'Casado', 'Divorciado', 'Viudo', 'Unión libre'];

  constructor(
    private participantService: ParticipantService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  applyFilters(resetPage = true): void {
    this.updateFilterOptions();
    if (resetPage) this.page = 1;
    const terms = searchText(this.searchTerm).split(/\s+/).filter(Boolean);
    this.filtered = this.participants
      .filter((p) => {
        const name = searchText(
          `${p.firstName} ${p.firstLastName} ${p.secondLastName ?? ''} ${p.cedula ?? ''}`,
        );
        if (!terms.every((term) => name.includes(term))) return false;
        if (this.filterEventId && p.eventId !== this.filterEventId) return false;
        if (this.filterEdadMin != null && (p.age ?? 0) < this.filterEdadMin) return false;
        if (this.filterEdadMax != null && (p.age ?? 999) > this.filterEdadMax) return false;
        if (this.filterEstadoCivil && p.maritalStatus !== this.filterEstadoCivil) return false;
        if (this.filterPais && p.country !== this.filterPais) return false;
        if (this.filterTribeId && p.tribeId !== this.filterTribeId) return false;
        return true;
      })
      .sort(comparePersonNames);
    this.page = Math.max(1, Math.min(this.page, this.pageCount));
    this.paged = this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }

  load(): void {
    this.loading = true;
    this.loadError = '';
    this.participantService
      .getChurchConsolidacion()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (data) => {
          this.participants = data;
          this.applyFilters(false);
        },
        error: () => {
          this.loadError = 'No se pudo cargar la consolidación de la iglesia. Intenta de nuevo.';
        },
      });
  }

  openNotes(participant: ConsolidationParticipant): void {
    if (this.notesSaving) return;
    this.notesRequest?.unsubscribe();
    this.returnFocus = document.activeElement as HTMLElement;
    this.notesParticipant = participant;
    const draft = this.drafts.get(participant.id);
    this.noteDraft = draft?.text ?? '';
    this.pendingNote = draft?.request ?? null;
    this.notes = [];
    this.noteSaveError = '';
    this.noteSuccess = '';
    this.loadNotes();
    setTimeout(() =>
      document.querySelector<HTMLElement>('#consolidation-note, .notes-close')?.focus(),
    );
  }

  loadNotes(): void {
    if (!this.notesParticipant) return;
    this.notesRequest?.unsubscribe();
    this.notesLoading = true;
    this.notesError = '';
    this.notesRequest = this.participantService
      .getConsolidationNotes(this.notesParticipant.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.notesLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (notes) => {
          this.notes = notes;
        },
        error: () => {
          this.notesError = 'No se pudieron cargar las notas. Intenta de nuevo.';
        },
      });
  }

  @HostListener('document:keydown.escape')
  closeNotes(): void {
    if (this.notesSaving || !this.notesParticipant) return;
    this.drafts.set(this.notesParticipant.id, { text: this.noteDraft, request: this.pendingNote });
    this.notesRequest?.unsubscribe();
    this.notesParticipant = null;
    this.returnFocus?.focus();
  }

  saveNote(): void {
    const content = this.noteDraft.trim();
    if (
      !this.notesParticipant ||
      this.notesSaving ||
      this.notesLoading ||
      this.notesError ||
      !content ||
      content.length > 4000
    )
      return;
    if (!this.pendingNote || this.pendingNote.content !== content)
      this.pendingNote = { id: crypto.randomUUID(), content };
    const participantId = this.notesParticipant.id;
    this.notesSaving = true;
    this.noteSaveError = '';
    this.noteSuccess = '';
    this.participantService
      .addConsolidationNote(participantId, this.pendingNote)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.notesSaving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (note) => {
          this.notes = [note, ...this.notes.filter((n) => n.id !== note.id)].sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt),
          );
          this.noteDraft = '';
          this.pendingNote = null;
          this.drafts.delete(participantId);
          this.noteSuccess = 'Nota guardada en el historial.';
        },
        error: (err) => {
          this.noteSaveError =
            err?.error?.error ??
            'No se pudo guardar la nota. Tu texto se conserva para volver a intentar.';
        },
      });
  }

  trapNotesFocus(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const elements = Array.from(
      (event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(
        'button:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
      ),
    );
    const first = elements[0],
      last = elements[elements.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  trackNote(_index: number, note: ConsolidationNote): string {
    return note.id;
  }

  openDrawer(p: Participant): void {
    this.drawerParticipant = p;
    this.drawerOpen = true;
  }
  closeDrawer(): void {
    this.drawerOpen = false;
  }
}
