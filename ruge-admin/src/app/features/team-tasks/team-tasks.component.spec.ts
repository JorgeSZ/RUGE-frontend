import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { EventContextService } from '../../core/services/event-context.service';
import { environment } from '../../../environments/environment';
import { TeamTasksComponent } from './team-tasks.component';

describe('Event team tasks', () => {
  let http: HttpTestingController;
  const event = { id:'event-a', name:'Reto', isArchived:false };
  const path = `${environment.apiUrl}/events/event-a/team-tasks/Logistica`;
  beforeEach(async () => {
    event.isArchived = false;
    await TestBed.configureTestingModule({imports:[TeamTasksComponent],providers:[
      provideZonelessChangeDetection(),provideHttpClient(),provideHttpClientTesting(),
      {provide:ActivatedRoute,useValue:{snapshot:{data:{department:'Logistica'}}}},
      {provide:EventContextService,useValue:{activeEvent:event,activeEvent$:new BehaviorSubject(event)}},
      {provide:AuthService,useValue:{hasAnyRole:()=>true}}
    ]}).compileComponents(); http=TestBed.inject(HttpTestingController);
  });
  afterEach(()=>http.verify());
  async function render() {
    const f=TestBed.createComponent(TeamTasksComponent);f.detectChanges();
    http.expectOne(path).flush([]);
    if(!event.isArchived) http.expectOne(path+'/assignees').flush([{id:'servant',nombre:'Servidor'}]);
    await f.whenStable();return f;
  }
  it('saving closes the dialog and clears saving after refreshing',async()=>{
    const f=await render();const c=f.componentInstance;c.edit();c.editing!.name='Preparar material';c.editing!.assignedUserId='servant';
    const save=c.save();const req=http.expectOne(r=>r.method==='PUT');
    expect(req.request.body.assignedUserId).toBe('servant');expect(req.request.body.operationId).toBeTruthy();
    req.flush({});await Promise.resolve();await Promise.resolve();
    http.expectOne(path).flush([]);http.expectOne(path+'/assignees').flush([]);await save;
    expect(c.editing).toBeNull();expect(c.saving).toBe(false);f.destroy();
  });
  it('a conflict preserves the form and lets the user correct it',async()=>{
    const f=await render();const c=f.componentInstance;c.edit();c.editing!.name='Tarea';
    const save=c.save();http.expectOne(r=>r.method==='PUT').flush({error:'La tarea cambió'},{status:409,statusText:'Conflict'});await save;
    expect(c.editing?.name).toBe('Tarea');expect(c.error).toContain('cambió');expect(c.saving).toBe(false);f.destroy();
  });
  it('archived events hide write controls and reject saves locally',async()=>{
    event.isArchived=true;const f=await render();const c=f.componentInstance;
    expect(f.nativeElement.textContent).toContain('solo lectura');expect(f.nativeElement.textContent).not.toContain('+ Nueva tarea');
    c.edit();c.editing!.name='No guardar';await c.save();http.expectNone(r=>r.method==='PUT');f.destroy();
  });
});
