import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { importProvidersFrom, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LucideAngularModule } from 'lucide-angular';
import * as icons from '../../core/icons/lucide-icons';
import { environment } from '../../../environments/environment';
import { CrmComponent } from './crm.component';

const person = { id: 'person-1', firstName: 'Ana', firstLastName: 'Soto', legacyNumber: 'LG55', events: ['Reto anterior'] };
const note = { id: 'note-1', content: 'Seguimiento', createdByName: 'Admin', createdAt: '2026-11-19T10:00:00Z' };
describe('CRM church directory', () => {
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/crm`;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CrmComponent], providers: [provideZonelessChangeDetection(),
      provideHttpClient(), provideHttpClientTesting(), importProvidersFrom(LucideAngularModule.pick(icons))] }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  async function render() {
    const f = TestBed.createComponent(CrmComponent); f.detectChanges();
    http.expectOne(r => r.url.startsWith(base+'?')).flush({ items: [person], total: 26, page: 1, pageSize: 25 });
    http.expectOne(base+'/filters').flush({ events: ['Reto anterior'], origins: ['Legendarios'] });
    await f.whenStable(); return f;
  }
  async function open(f: Awaited<ReturnType<typeof render>>) {
    f.componentInstance.open(person);
    http.expectOne(base+'/person-1').flush({ person, attendances: [{ id: 'a1', eventName: 'Reto anterior', origin: 'Legendarios' }] });
    http.expectOne(base+'/person-1/notes').flush([note]);
    await f.whenStable();
  }
  it('shows legacy identification and pages on the server', async () => {
    const f = await render();
    expect(f.nativeElement.textContent).toContain('LGND LG55');
    expect(f.componentInstance.loading).toBe(false);
    f.componentInstance.setPage(2);
    const req=http.expectOne(r=>r.url.includes('page=2'));
    req.flush({ items: [], total: 26, page: 2, pageSize: 25 });
    await f.whenStable();expect(f.componentInstance.page).toBe(2);
  });
  it('does not offer a blank editable form when loading a person fails', async () => {
    const f = await render(); f.componentInstance.open(person);
    http.expectOne(base+'/person-1/notes').flush([]);
    http.expectOne(base+'/person-1').flush({}, {status:500,statusText:'Error'});
    await f.whenStable();
    expect(f.componentInstance.detailReady).toBe(false);
    expect(f.nativeElement.querySelector('#crm-form')).toBeNull();
    expect(f.nativeElement.querySelector('button[form="crm-form"]').disabled).toBe(true);
  });
  it('closes the dialog after saving and refreshes the list', async () => {
    const f=await render(); await open(f);
    const input:HTMLInputElement=f.nativeElement.querySelector('#crm-firstName');input.value='Ana María';input.dispatchEvent(new Event('input'));
    await f.whenStable(); f.nativeElement.querySelector('#crm-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    const req=http.expectOne(base+'/person-1');expect(req.request.method).toBe('PUT');expect(req.request.body.firstName).toBe('Ana María');req.flush(null);
    http.expectOne(r=>r.url.startsWith(base+'?')).flush({items:[person],total:1,page:1,pageSize:25});
    http.expectOne(base+'/filters').flush({events:[],origins:[]});
    await f.whenStable();expect(f.componentInstance.modal).toBe(false);expect(f.componentInstance.saving).toBe(false);
  });
  it('keeps data and resets saving after a failed request', async () => {
    const f=await render();await open(f);
    f.nativeElement.querySelector('#crm-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    http.expectOne(base+'/person-1').flush({error:'No disponible'},{status:500,statusText:'Error'});
    await f.whenStable();expect(f.componentInstance.modal).toBe(true);expect(f.componentInstance.saving).toBe(false);
    expect(f.componentInstance.draft.firstName).toBe('Ana');expect(f.nativeElement.textContent).toContain('No disponible');
  });
  it('shows service retreats below received retreats with name and date only', async () => {
    const f=await render();f.componentInstance.open(person);
    http.expectOne(base+'/person-1').flush({person,attendances:[{id:'a1',eventName:'Reto recibido',origin:'RUGE'}],
      serviceHistory:[{eventId:'e1',eventName:'Reto como servidor',eventDate:'2025-11-21T00:00:00'}]});
    http.expectOne(base+'/person-1/notes').flush([]);await f.whenStable();
    const sections=Array.from(f.nativeElement.querySelectorAll('h4')).map((el:any)=>el.textContent);
    expect(sections).toEqual(['Historial de retos','Historial de servicio','Notas de seguimiento']);
    const history:HTMLElement=f.nativeElement.querySelector('.service-history');
    expect(history.textContent).toContain('Reto como servidor');expect(history.textContent).toContain('21/11/2025');
    expect(history.querySelector('button')).toBeNull();expect(history.querySelectorAll('li').length).toBe(1);
  });
  it('hides service history when no matching document exists and clears previous results', async () => {
    const f=await render();await open(f);
    expect(f.nativeElement.querySelector('.service-history')).toBeNull();
    f.componentInstance.serviceHistory=[{eventId:'e1',eventName:'Previous person',eventDate:null}];
    f.componentInstance.open({...person,id:'person-2'});
    expect(f.componentInstance.serviceHistory).toEqual([]);
    http.expectOne(base+'/person-2').flush({person:{...person,id:'person-2'},attendances:[],serviceHistory:[]});
    http.expectOne(base+'/person-2/notes').flush([]);await f.whenStable();
    expect(f.nativeElement.querySelector('.service-history')).toBeNull();
    expect(f.nativeElement.textContent).not.toContain('Previous person');
  });
  it('reuses the same note id on retry, preventing duplicate notes', async () => {
    const f=await render();await open(f);const c=f.componentInstance;c.noteDraft='Llamar mañana';c.saveNote();
    const req=http.expectOne(base+'/person-1/notes');const id=req.request.body.id;req.flush({},{status:500,statusText:'Error'});
    await f.whenStable();expect(c.noteSaving).toBe(false);expect(c.noteDraft).toBe('Llamar mañana');c.saveNote();
    const retry=http.expectOne(base+'/person-1/notes');expect(retry.request.body.id).toBe(id);retry.flush({...note,id,content:c.noteDraft});
    http.expectOne(r=>r.url.startsWith(base+'?')).flush({items:[person],total:1,page:1,pageSize:25});
    await f.whenStable();expect(c.noteDraft).toBe('');expect(c.notes.length).toBe(2);expect(c.noteSaving).toBe(false);
  });
});
