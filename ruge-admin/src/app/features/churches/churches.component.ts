import { initials, searchText } from '../global-management/global-management.utils';
import { DialogService } from '../../core/services/dialog.service';
import { inject, ChangeDetectorRef, Component, DestroyRef, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { ChurchContextService } from '../../core/services/church-context.service';
import { EventContextService } from '../../core/services/event-context.service';

interface AdministratorCandidate {
  id: string; username: string; nombre: string; email: string; role: string;
}

interface ChurchRow {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  administrator: { id: string; username: string; nombre: string; email?: string | null } | null;
  license: { id: string; type: string; startsAt: string; expiresAt: string | null; isExpired: boolean } | null;
}

@Component({
  selector: 'app-churches',
  templateUrl: './churches.component.html',
  styleUrls: ['../global-management/global-management.css', './churches.component.css'],
  standalone: false
})
export class ChurchesComponent implements OnInit {
  private readonly dialogs = inject(DialogService);
  private readonly destroyRef = inject(DestroyRef);
  private candidateRequest?: Subscription;
  administratorChurch: ChurchRow | null = null;
  administratorCandidates: AdministratorCandidate[] = [];
  administratorSearch = '';
  selectedAdministratorId = '';
  administratorLoading = false;
  administratorSaving = false;
  administratorError = '';
  administratorLoadError = '';

  churches: ChurchRow[] = [];
  loading = false;
  saving = false;
  savingEdit = false;
  showCreate = false;
  editingChurch: ChurchRow | null = null;
  search = ''; status = 'all'; page = 1; readonly pageSize = 10;
  licenseChurch: ChurchRow | null = null;
  licenseType = 'OneYear'; licenseError = ''; licenseSaving = false;
  statusActionId = ''; openingChurchId = ''; createError = '';
  readonly initials = initials;
  error = '';
  editError = '';
  success = '';
  readonly licenseTypes = [
    { value: 'SixMonths', label: '6 meses' },
    { value: 'OneYear', label: '1 año' },
    { value: 'Indefinite', label: 'Ilimitada' },
  ];
  readonly form: FormGroup;
  readonly editForm: FormGroup;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private router: Router,
    private eventCtx: EventContextService,
    public auth: AuthService,
    public churchCtx: ChurchContextService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(120)]],
      adminName: ['', [Validators.required, Validators.maxLength(100)]],
      adminEmail: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
      licenseType: ['OneYear', Validators.required],
    });
    this.editForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(120)]],
    });

  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.http.get<ChurchRow[]>(`${environment.apiUrl}/churches`).pipe(
      finalize(() => { this.loading = false; this.cdr.detectChanges(); })
    ).subscribe({
      next: rows => { this.churches = [...rows].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name, 'es')); this.page = Math.min(this.page, this.pageCount); },
      error: err => { this.error = err?.error?.error ?? 'No se pudieron cargar las iglesias.'; }
    });
  }

  create(): void {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    this.createError = '';
    this.success = '';
    const value = this.form.getRawValue();
    this.http.post(`${environment.apiUrl}/churches`, value).pipe(
      finalize(() => { this.saving = false; this.cdr.detectChanges(); })
    ).subscribe({
      next: () => {
        this.showCreate = false;
        this.form.reset({ licenseType: 'OneYear' });
        this.success = 'Iglesia creada con su administrador y licencia.';
        this.load();
      },
      error: err => { this.createError = err?.error?.error ?? 'No se pudo crear la iglesia.'; }
    });
  }

  openEdit(church: ChurchRow): void {
    this.editError = '';
    this.editingChurch = church;
    this.editForm.reset({
      name: church.name,
    });
  }

  closeEdit(): void {
    if (this.savingEdit) return;
    this.editingChurch = null;
    this.editForm.reset();
    this.editError = '';
  }

  saveChurchDetails(): void {
    if (!this.editingChurch || this.editForm.invalid || this.savingEdit) {
      this.editForm.markAllAsTouched();
      return;
    }

    const church = this.editingChurch;
    this.savingEdit = true;
    this.editError = '';
    this.success = '';
    this.http.put(`${environment.apiUrl}/churches/${church.id}`, this.editForm.getRawValue()).pipe(
      finalize(() => { this.savingEdit = false; this.cdr.detectChanges(); })
    ).subscribe({
      next: () => {
        this.editingChurch = null;
        this.editForm.reset();
        this.success = `Información de ${church.name} actualizada.`;
        this.load();
      },
      error: err => { this.editError = err?.error?.error ?? 'No se pudo actualizar la iglesia.'; }
    });
  }

  openAdministrator(church: ChurchRow): void {
    if (this.auth.currentUser?.rol !== 'GlobalAdmin' || this.administratorSaving) return;
    this.candidateRequest?.unsubscribe();
    this.administratorChurch = church;
    this.administratorCandidates = [];
    this.administratorSearch = '';
    this.selectedAdministratorId = '';
    this.administratorError = '';
    this.loadAdministratorCandidates();
  }

  closeAdministrator(): void {
    if (this.administratorSaving) return;
    this.candidateRequest?.unsubscribe();
    this.administratorChurch = null;
  }

  loadAdministratorCandidates(): void {
    if (!this.administratorChurch) return;
    this.candidateRequest?.unsubscribe();
    this.administratorLoading = true;
    this.administratorLoadError = '';
    const church = this.administratorChurch;
    this.candidateRequest = this.http.get<AdministratorCandidate[]>(
      `${environment.apiUrl}/churches/${church.id}/administrator-candidates`
    ).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => {
      this.administratorLoading = false; this.cdr.markForCheck();
    })).subscribe({
      next: candidates => { this.administratorCandidates = candidates.filter(u => u.id !== church.administrator?.id); },
      error: () => { this.administratorLoadError = 'No se pudieron cargar los usuarios de la iglesia.'; }
    });
  }

  get filteredAdministratorCandidates(): AdministratorCandidate[] {
    const terms = searchText(this.administratorSearch).split(/\s+/).filter(Boolean);
    return this.administratorCandidates.filter(u => terms.every(term =>
      searchText(`${u.nombre} ${u.username} ${u.email}`).includes(term)));
  }

  async changeAdministrator(): Promise<void> {
    const church = this.administratorChurch;
    const selected = this.administratorCandidates.find(u => u.id === this.selectedAdministratorId);
    if (!church || !selected || this.administratorSaving || this.administratorLoading || this.administratorLoadError ||
        this.auth.currentUser?.rol !== 'GlobalAdmin') return;
    this.administratorSaving = true;
    this.administratorError = '';
    const confirmed = await this.dialogs.confirm(
      `${selected.nombre} (@${selected.username}) será el administrador principal de ${church.name} y recibirá los avisos dirigidos al administrador. El anterior conservará su rol Admin y su acceso.`,
      { title: 'Cambiar administrador principal', confirmText: 'Confirmar cambio' });
    if (this.destroyRef.destroyed) return;
    if (!confirmed) { this.administratorSaving = false; this.cdr.markForCheck(); return; }
    this.http.put<{ administrator: ChurchRow['administrator'] }>(
      `${environment.apiUrl}/churches/${church.id}/administrator`,
      { userId: selected.id, expectedAdministratorUserId: church.administrator?.id ?? null }
    ).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => {
      this.administratorSaving = false; this.cdr.markForCheck();
    })).subscribe({
      next: result => {
        this.churches = this.churches.map(item => item.id === church.id ? { ...item, administrator: result.administrator } : item);
        this.administratorChurch = null;
        this.success = `Administrador principal de ${church.name} actualizado. El nuevo responsable debe iniciar sesión nuevamente para cargar sus permisos.`;
      },
      error: err => {
        this.administratorError = err?.error?.error ?? 'No se pudo cambiar el administrador. Intenta nuevamente.';
        if (err.status === 409) this.load();
      }
    });
  }

  get activeCount(): number { return this.churches.filter(c => c.isActive).length; }
  get licensedCount(): number { return this.churches.filter(c => c.license && !c.license.isExpired).length; }
  get expiringCount(): number {
    const now = Date.now();
    return this.churches.filter(c => c.license?.expiresAt && !c.license.isExpired &&
      new Date(c.license.expiresAt).getTime() >= now && new Date(c.license.expiresAt).getTime() - now <= 30 * 86400000).length;
  }
  get attentionCount(): number { return this.churches.filter(c => c.isActive && (!c.license || c.license.isExpired)).length; }
  get filteredChurches(): ChurchRow[] {
    const words = searchText(this.search).split(' ').filter(Boolean);
    return this.churches.filter(c => words.every(w => searchText(`${c.name} ${c.administrator?.nombre ?? ''} ${c.administrator?.username ?? ''} ${c.administrator?.email ?? ''}`).includes(w)) &&
      (this.status === 'all' || this.status === 'active' && this.canOpen(c) || this.status === 'attention' && c.isActive && !this.canOpen(c) || this.status === 'inactive' && !c.isActive));
  }
  get pageCount(): number { return Math.max(1, Math.ceil(this.filteredChurches.length / this.pageSize)); }
  get visibleChurches(): ChurchRow[] { return this.filteredChurches.slice((this.page - 1) * this.pageSize, this.page * this.pageSize); }
  resetFilters(): void { this.search = ''; this.status = 'all'; this.page = 1; }
  openCreate(): void { this.createError = ''; this.form.reset({ licenseType: 'OneYear' }); this.showCreate = true; }
  closeCreate(): void { if (!this.saving) this.showCreate = false; }
  openLicense(church: ChurchRow): void { this.licenseChurch = church; this.licenseType = church.license?.type ?? 'OneYear'; this.licenseError = ''; }
  closeLicense(): void { if (!this.licenseSaving) this.licenseChurch = null; }
  grantLicense(): void {
    if (!this.licenseChurch || this.licenseSaving) return;
    const church = this.licenseChurch;
    this.licenseSaving = true; this.licenseError = ''; this.success = '';
    this.http.post(`${environment.apiUrl}/churches/${church.id}/licenses`, { type: this.licenseType }).pipe(
      finalize(() => { this.licenseSaving = false; this.cdr.markForCheck(); })
    ).subscribe({
      next: () => { this.licenseChurch = null; this.success = `Licencia actualizada para ${church.name}.`; this.load(); },
      error: err => { this.licenseError = err?.error?.error ?? 'No se pudo actualizar la licencia.'; }
    });
  }
  async toggleActive(church: ChurchRow): Promise<void> {
    if (this.statusActionId) return;
    const isActive = !church.isActive;
    if (!isActive && !await this.dialogs.confirm(`Los usuarios de ${church.name} perderán el acceso hasta que reactives la iglesia.`,
      { title: 'Desactivar iglesia', confirmText: 'Desactivar', destructive: true })) return;
    this.statusActionId = church.id; this.error = ''; this.cdr.markForCheck();
    this.http.patch(`${environment.apiUrl}/churches/${church.id}/status`, { isActive }).pipe(
      finalize(() => { this.statusActionId = ''; this.cdr.markForCheck(); })
    ).subscribe({
      next: () => { this.success = isActive ? `${church.name} está activa.` : `${church.name} fue desactivada.`; this.load(); },
      error: err => { this.error = err?.error?.error ?? 'No se pudo cambiar el estado.'; }
    });
  }
  async openChurch(church: ChurchRow): Promise<void> {
    if (!this.canOpen(church) || this.openingChurchId) return;
    this.openingChurchId = church.id;
    this.eventCtx.clear();
    this.churchCtx.select(church.id, church.name);
    try { await this.eventCtx.initialize(); await this.router.navigate(['/events']); }
    catch { this.error = 'No se pudo abrir la iglesia. Intenta nuevamente.'; }
    finally { this.openingChurchId = ''; this.cdr.markForCheck(); }
  }
  licenseTypeLabel(church: ChurchRow): string {
    return this.licenseTypes.find(t => t.value === church.license?.type)?.label ?? 'Sin licencia';
  }
  remainingPercent(church: ChurchRow): number {
    if (!church.license || church.license.isExpired) return 0;
    if (!church.license.expiresAt) return 100;
    const start = new Date(church.license.startsAt).getTime();
    const end = new Date(church.license.expiresAt).getTime();
    return end > start ? Math.max(0, Math.min(100, (end - Date.now()) / (end - start) * 100)) : 0;
  }

  clearSelection(): void {
    this.churchCtx.clear();
    this.eventCtx.clear();
  }

  licenseLabel(church: ChurchRow): string {
    if (!church.license) return 'Sin licencia';
    if (church.license.isExpired) return 'Vencida';
    if (!church.license.expiresAt) return 'Ilimitada';
    const type = church.license.type === 'SixMonths' ? '6 meses' : '1 año';
    return `${type} · vence ${new Date(church.license.expiresAt).toLocaleDateString('es-CR')}`;
  }

  canOpen(church: ChurchRow): boolean {
    return church.isActive && !!church.license && !church.license.isExpired;
  }
}
