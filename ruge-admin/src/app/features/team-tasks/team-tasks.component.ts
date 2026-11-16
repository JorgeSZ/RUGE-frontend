import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { EventContextService } from '../../core/services/event-context.service';
import { AuthService } from '../../core/services/auth.service';

interface Task { id: string; name: string; description?: string; assignedUserId: string | null; assignedUserName?: string;
  completed: boolean; completedByName?: string; completedAt?: string; revision: number; }
@Component({ selector: 'app-team-tasks', standalone: true, imports: [CommonModule, FormsModule],
  templateUrl: './team-tasks.component.html', styleUrls: ['./team-tasks.component.css'] })
export class TeamTasksComponent implements OnInit, OnDestroy {
  department = 'Logistica'; tasks: Task[] = []; users: {id:string; nombre:string}[] = [];
  loading = false; saving = false; error = ''; search = ''; status = ''; page = 1; readonly size = 20;
  editing: Task | null = null; private timer?: ReturnType<typeof setInterval>; private sub?: Subscription;
  private epoch = 0; private destroyed = false;
  constructor(private api: ApiService, public eventCtx: EventContextService, private route: ActivatedRoute,
    private auth: AuthService, private cdr: ChangeDetectorRef) {}
  get title() { return this.department === 'Logistica' ? 'Logística' : 'Eventos'; }
  get manager() { return this.auth.hasAnyRole(['Admin', 'Coordinador', 'GlobalAdmin', this.department]); }
  get readonly() { return !!this.eventCtx.activeEvent?.isArchived; }
  get path() { return `/events/${this.eventCtx.activeEvent?.id}/team-tasks/${this.department}`; }
  get filtered() { const q = this.search.trim().toLocaleLowerCase('es'); return this.tasks.filter(t =>
    `${t.name} ${t.assignedUserName ?? ''}`.toLocaleLowerCase('es').includes(q) && (!this.status || String(t.completed) === this.status)); }
  get pages() { return Math.max(1, Math.ceil(this.filtered.length / this.size)); }
  get rows() { return this.filtered.slice((this.page - 1) * this.size, this.page * this.size); }
  get completed() { return this.tasks.filter(t => t.completed).length; }
  ngOnInit() {
    this.department = this.route.snapshot.data['department'];
    this.sub = this.eventCtx.activeEvent$.subscribe(() => { this.epoch++; this.editing = null; this.page = 1; void this.load(true); });
    this.timer = setInterval(() => { if (!document.hidden && !this.editing && !this.saving) void this.load(); }, 30000);
  }
  ngOnDestroy() { this.destroyed = true; this.epoch++; this.sub?.unsubscribe(); clearInterval(this.timer); }
  async load(show = false) {
    if (!this.eventCtx.activeEvent) return;
    const epoch = ++this.epoch; const path = this.path; if (show) this.loading = true;
    try {
      const [tasks, users] = await Promise.all([firstValueFrom(this.api.get<Task[]>(path)), this.manager && !this.readonly
        ? firstValueFrom(this.api.get<{id:string;nombre:string}[]>(`${path}/assignees`)) : Promise.resolve([])]);
      if (epoch !== this.epoch || this.destroyed) return;
      this.tasks = tasks; this.users = users; this.page = Math.min(this.page, this.pages); this.error = '';
    } catch (e: any) { if (epoch === this.epoch) this.error = e.error?.error || 'No se pudieron cargar las tareas.'; }
    finally { if (epoch === this.epoch && !this.destroyed) { this.loading = false; this.cdr.detectChanges(); } }
  }
  edit(task?: Task) {
    this.editing = task ? {...task} : {id: crypto.randomUUID(), name:'', description:'', assignedUserId:null, completed:false, revision:0};
  }
  async save() {
    if (!this.editing || !this.editing.name.trim() || this.saving || this.readonly) return;
    this.saving = true; this.error = ''; this.epoch++;
    try { const t = this.editing; await firstValueFrom(this.api.put(`${this.path}/${t.id}`, {
      name: t.name.trim(), description: t.description, assignedUserId: t.assignedUserId || null, revision:t.revision, operationId:crypto.randomUUID()
    })); this.editing = null; await this.load(); }
    catch (e: any) { this.error = e.error?.error || 'No se pudo guardar la tarea.'; }
    finally { this.saving = false; if (!this.destroyed) this.cdr.detectChanges(); }
  }
  async toggle(t: Task) {
    if (this.saving || this.readonly || (!this.manager && t.completed)) return;
    this.saving = true; this.epoch++;
    try { await firstValueFrom(this.api.patch(`${this.path}/${t.id}/status`, {completed:!t.completed, operationId:crypto.randomUUID()})); await this.load(); }
    catch (e: any) { this.error = e.error?.error || 'No se pudo actualizar la tarea.'; }
    finally { this.saving = false; if (!this.destroyed) this.cdr.detectChanges(); }
  }
}
