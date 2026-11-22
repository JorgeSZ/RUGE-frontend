import { ChangeDetectorRef, Component, DestroyRef, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { finalize, forkJoin, Subject, Subscription, debounceTime, Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CrmService, CrmPerson, CrmAttendance, CrmWrite } from '../../core/services/crm.service';
import { ConsolidationNote, CreateConsolidationNote } from '../../core/models/consolidation-note.model';

@Component({ selector: 'app-crm', standalone: true, imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './crm.component.html', styleUrls: ['./crm.component.css', '../list-pagination.css'] })
export class CrmComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private changes = new Subject<void>();
  private request?: Subscription;
  private detailRequest?: Subscription;
  private returnFocus: HTMLElement | null = null;
  private pendingNote?: CreateConsolidationNote;
  rows: CrmPerson[] = []; total = 0; page = 1; pageSize = 25;
  search = ''; eventName = ''; origin = ''; missingIdentity = false;
  events: string[] = []; origins: string[] = [];
  loading = false; error = ''; modal = false; detailLoading = false; detailReady = false; saving = false; noteSaving = false;
  modalError = ''; noteError = ''; noteDraft = ''; noteSuccess = '';
  selected: CrmPerson | null = null; draft: CrmWrite = { firstName: '' };
  attendances: CrmAttendance[] = []; notes: ConsolidationNote[] = [];
  readonly fields: { key: Exclude<keyof CrmWrite, 'd12Patch' | 'eventName' | 'eventDate'>; label: string; max: number; type?: string }[] = [
    { key: 'firstName', label: 'Nombre', max: 200 }, { key: 'firstLastName', label: 'Primer apellido', max: 150 },
    { key: 'secondLastName', label: 'Segundo apellido', max: 150 }, { key: 'cedula', label: 'Cédula / pasaporte', max: 80 },
    { key: 'legacyNumber', label: 'Número de Legendarios', max: 80 }, { key: 'birthDate', label: 'Fecha de nacimiento', type: 'date', max: 10 },
    { key: 'phone', label: 'Celular', type: 'tel', max: 60 }, { key: 'email', label: 'Correo electrónico', type: 'email', max: 254 },
    { key: 'church', label: 'Iglesia a la que pertenece', max: 250 }, { key: 'country', label: 'País', max: 100 },
    { key: 'maritalStatus', label: 'Estado civil', max: 50 }, { key: 'shirtSize', label: 'Talla', max: 20 },
    { key: 'spouseName', label: 'Nombre de la esposa', max: 200 }, { key: 'spousePhone', label: 'Teléfono de la esposa', type: 'tel', max: 60 },
    { key: 'emergencyContactName', label: 'Contacto de emergencia', max: 200 }, { key: 'emergencyContactPhone', label: 'Teléfono de emergencia', type: 'tel', max: 60 },
  ];
  constructor(private crm: CrmService, private cdr: ChangeDetectorRef) {}
  get pageCount() { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get firstResult() { return this.total ? (this.page - 1) * this.pageSize + 1 : 0; }
  get lastResult() { return Math.min(this.page * this.pageSize, this.total); }
  ngOnInit() {
    this.changes.pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
    this.load(); this.loadFilters();
  }
  loadFilters() { this.crm.filters().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: data => {
    this.events = data.events; this.origins = data.origins; this.cdr.markForCheck();
  }, error: () => {} }); }
  searchChanged() { this.page = 1; this.request?.unsubscribe(); this.changes.next(); }
  filterChanged() { this.page = 1; this.load(); }
  setPage(page: number) { this.page = page; this.load(); }
  load() {
    this.request?.unsubscribe(); this.loading = true; this.error = '';
    this.request = this.crm.list({ search: this.search, eventName: this.eventName, origin: this.origin,
      missingIdentity: this.missingIdentity, page: this.page, pageSize: this.pageSize })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({ next: data => { this.rows = data.items; this.total = data.total; this.page = data.page; },
        error: () => { this.error = 'No se pudo cargar el CRM. Intenta nuevamente.'; } });
  }
  fullName(p: CrmPerson) { return [p.firstName, p.firstLastName, p.secondLastName].filter(Boolean).join(' '); }
  open(person: CrmPerson | null = null) {
    this.detailRequest?.unsubscribe(); this.returnFocus = document.activeElement as HTMLElement;
    this.selected = person; this.modal = true; this.modalError = ''; this.noteError = ''; this.noteSuccess = '';
    this.pendingNote = undefined; this.noteDraft = ''; this.notes = []; this.attendances = [];
    this.draft = { firstName: '' }; this.detailLoading = !!person; this.detailReady = !person;
    if (person) this.detailRequest = forkJoin({ detail: this.crm.get(person.id), notes: this.crm.notes(person.id) })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => { this.detailLoading = false; this.cdr.markForCheck(); }))
      .subscribe({ next: ({ detail, notes }) => {
        const p = detail.person;
        this.draft = { firstName: p.firstName, d12Patch: p.d12Patch ?? null };
        for (const f of this.fields) this.draft[f.key] = p[f.key] ?? '';
        this.draft.birthDate = p.birthDate?.slice(0,10) ?? '';
        this.attendances = detail.attendances; this.notes = notes;
        this.detailReady = true;
        setTimeout(() => document.getElementById('crm-firstName')?.focus());
      }, error: () => { this.modalError = 'No se pudo cargar el registro. Cierra e intenta nuevamente.'; } });
    else setTimeout(() => document.getElementById('crm-firstName')?.focus());
  }
  @HostListener('document:keydown.escape')
  close() {
    if (!this.modal || this.saving || this.noteSaving) return;
    this.detailRequest?.unsubscribe(); this.modal = false; this.returnFocus?.focus();
  }
  save(form: NgForm) {
    if (form.invalid || !this.draft.firstName.trim() || this.saving || this.noteSaving || !this.detailReady) return;
    this.saving = true; this.modalError = '';
    const data = { ...this.draft, birthDate: this.draft.birthDate || undefined, eventDate: this.draft.eventDate || undefined };
    const request: Observable<unknown> = this.selected ? this.crm.update(this.selected.id, data) : this.crm.create(data);
    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => { this.saving = false; this.cdr.markForCheck(); }))
      .subscribe({ next: () => { this.modal = false; this.returnFocus?.focus(); this.load(); this.loadFilters(); },
        error: err => { this.modalError = err?.error?.error ?? 'No se pudo guardar. Tus datos se conservan.'; } });
  }
  saveNote() {
    const content = this.noteDraft.trim();
    if (!this.selected || this.noteSaving || this.saving || !this.detailReady || !content || content.length > 4000) return;
    if (this.pendingNote?.content !== content) this.pendingNote = { id: crypto.randomUUID(), content };
    this.noteSaving = true; this.noteError = ''; this.noteSuccess = '';
    this.crm.addNote(this.selected.id, this.pendingNote!).pipe(takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.noteSaving = false; this.cdr.markForCheck(); })).subscribe({ next: note => {
        this.notes = [note, ...this.notes.filter(n => n.id !== note.id)]; this.noteDraft = ''; this.pendingNote = undefined;
        this.noteSuccess = 'Nota guardada.'; this.load();
      }, error: err => { this.noteError = err?.error?.error ?? 'No se pudo guardar la nota. Puedes reintentar.'; } });
  }
  trapFocus(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    const elements = Array.from((event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)'));
    const first = elements[0], last = elements[elements.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  trackPerson(_index: number, person: CrmPerson) { return person.id; }
}
