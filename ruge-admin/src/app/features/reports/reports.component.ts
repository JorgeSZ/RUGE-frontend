import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ReportService } from '../../core/services/report.service';
import { EventContextService } from '../../core/services/event-context.service';
import {
  ShirtListResponse, ShirtSummaryResponse, DiscipleshipPatchResponse, DiscipleshipPatchEntry,
  CapsReportResponse
} from '../../core/models/report.model';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css'],
  standalone: false
})
export class ReportsComponent implements OnInit {
  activeCard: 'shirts' | 'patches' | 'caps' | null = null;
  activeShirtTab: 'summary' | 'list' = 'summary';

  shirtList: ShirtListResponse | null = null;
  shirtSummary: ShirtSummaryResponse | null = null;
  patches: DiscipleshipPatchResponse | null = null;
  caps: CapsReportResponse | null = null;

  loadingShirts = false;
  loadingPatches = false;
  loadingCaps = false;

  shirtFilter = '';
  shirtSearch = '';
  patchSearch = '';
  capsSearch = '';

  get eventId(): string { return this.eventCtx.activeEvent!.id; }
  get eventName(): string { return this.eventCtx.activeEvent!.name; }

  constructor(
    public eventCtx: EventContextService,
    private reportService: ReportService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {}

  openShirts(): void {
    if (this.activeCard === 'shirts') { this.activeCard = null; return; }
    this.activeCard = 'shirts';
    if (!this.shirtList) this.loadShirts();
  }

  openPatches(): void {
    if (this.activeCard === 'patches') { this.activeCard = null; return; }
    this.activeCard = 'patches';
    if (!this.patches) this.loadPatches();
  }

  loadShirts(): void {
    this.loadingShirts = true;
    this.reportService.getShirtSummary(this.eventId).subscribe({
      next: s => { this.shirtSummary = s; this.cdr.detectChanges(); },
      error: () => {}
    });
    this.reportService.getShirtList(this.eventId).subscribe({
      next: l => { this.shirtList = l; this.loadingShirts = false; this.cdr.detectChanges(); },
      error: () => { this.loadingShirts = false; this.cdr.detectChanges(); }
    });
  }

  loadPatches(): void {
    this.loadingPatches = true;
    this.reportService.getDiscipleshipPatches(this.eventId).subscribe({
      next: p => { this.patches = p; this.loadingPatches = false; this.cdr.detectChanges(); },
      error: () => { this.loadingPatches = false; this.cdr.detectChanges(); }
    });
  }

  get filteredShirtList() {
    if (!this.shirtList) return [];
    return this.shirtList.participantes.filter(p => {
      const matchTalla = !this.shirtFilter || p.talla === this.shirtFilter;
      const q = this.shirtSearch.toLowerCase();
      const matchNombre = !q || (p.nombre + ' ' + p.primerApellido + ' ' + (p.segundoApellido ?? '')).toLowerCase().includes(q);
      return matchTalla && matchNombre;
    });
  }

  get patchesByCommission(): { comision: string; items: DiscipleshipPatchEntry[] }[] {
    if (!this.patches) return [];
    const q = this.patchSearch.toLowerCase();
    const filtered = this.patches.servidores.filter(s =>
      !q || (s.nombre + ' ' + s.primerApellido).toLowerCase().includes(q)
    );
    const map = new Map<string, DiscipleshipPatchEntry[]>();
    filtered.forEach(s => {
      const k = s.comision ?? 'Sin comisión';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    });
    return Array.from(map.entries()).map(([comision, items]) => ({ comision, items }));
  }

  tallaColor(talla: string): string {
    const m: Record<string, string> = { S: '#BDD7EE', M: '#C6EFCE', L: '#FFEB9C', XL: '#FCE4D6' };
    return m[talla] ?? '#2E3830';
  }

  tallaTextColor(talla: string): string {
    const m: Record<string, string> = { S: '#1e40af', M: '#166534', L: '#92400e', XL: '#9a3412' };
    return m[talla] ?? '#A8A49C';
  }

  progressWidth(count: number): number {
    const total = this.shirtSummary?.totalParticipants ?? 0;
    return total > 0 ? Math.round(count / total * 100) : 0;
  }

  openCaps(): void {
    if (this.activeCard === 'caps') { this.activeCard = null; return; }
    this.activeCard = 'caps';
    if (!this.caps) this.loadCaps();
  }

  loadCaps(): void {
    this.loadingCaps = true;
    this.reportService.getCaps(this.eventId).subscribe({
      next: c => { this.caps = c; this.loadingCaps = false; this.cdr.detectChanges(); },
      error: () => { this.loadingCaps = false; this.cdr.detectChanges(); }
    });
  }

  get filteredCaps() {
    if (!this.caps) return [];
    const q = this.capsSearch.toLowerCase();
    return this.caps.senderistas.filter(s => !q || s.firstName.toLowerCase().includes(q));
  }

  exportShirtList(): void    { this.reportService.exportShirtList(this.eventId, this.eventName); }
  exportShirtSummary(): void { this.reportService.exportShirtSummary(this.eventId, this.eventName); }
  exportPatches(): void      { this.reportService.exportDiscipleshipPatches(this.eventId, this.eventName); }
  exportCaps(): void         { this.reportService.exportCaps(this.eventId, this.eventName); }
}
