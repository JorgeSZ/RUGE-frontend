import { CommonModule } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { vi } from 'vitest';
import * as icons from '../../core/icons/lucide-icons';
import { environment } from '../../../environments/environment';
import { EventHistoryComponent } from './event-history.component';

const event = { id: 'archived-event', name: 'Reto Histórico 3', startDate: '2026-10-01', endDate: '2026-10-04', archivedAt: '2026-10-05' };
const people = Array.from({ length: 26 }, (_, i) => ({
  id: `person-${i}`, firstName: `Persona ${String(i).padStart(2, '0')}`, firstLastName: 'Álvarez',
  cedula: `1000000${i}`, birthDate: '1990-01-01', phone: '88888888',
  comprobantePagoPath: i ? 'https://files.example.test/receipt.pdf' : '/uploads/receipt.pdf',
  qrCode: `qr-${i}`, medicalConditions: 'Asma', emergencyContactName: 'Contacto de emergencia', emergencyContactPhone: '87777777',
  nombreEsposa: 'Esposa', telefonoEsposa: '86666666', medications: [{ nombreMedicamento: 'Medicamento', dosis: '10 mg', horarios: '08:00,20:00' }],
  checkInCompleted: true, hasDiscipleship: true, hasDiscipleshipPatch: true, estaEnNewLife: true, modulo: 3,
  nombreLider: 'Líder', emailLider: 'leader@example.test', approvalStatus: 'Aprobado', approvalToken: 'private-approval-token',
  createdAt: '2026-09-01T12:00:00Z', updatedAt: '2026-09-02T12:00:00Z',
}));

describe('Archived retreat people export', () => {
  let http: HttpTestingController;
  let download: ReturnType<typeof vi.spyOn>;
  let blob: Blob | undefined;
  let filename: string;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, RouterModule, LucideAngularModule.pick(icons)], declarations: [EventHistoryComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        {provide: ActivatedRoute, useValue: {snapshot: {paramMap: convertToParamMap({eventId: event.id})}}}],
    }).compileComponents();
    http=TestBed.inject(HttpTestingController);
    blob=undefined;filename='';
    vi.spyOn(URL,'createObjectURL').mockImplementation(value=>{blob=value as Blob;return 'blob:test';});
    vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
    download=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(this:HTMLAnchorElement){filename=this.download;});
  });
  afterEach(()=>{http.verify();vi.restoreAllMocks();});
  async function render(empty=false) {
    const f=TestBed.createComponent(EventHistoryComponent);f.detectChanges();
    http.expectOne(`${environment.apiUrl}/events/${event.id}/history`).flush({event,summary:{},tribes:[],challenges:[],
      participants:empty?[]:[...people].reverse(),servers:empty?[]:[...people].reverse(),medicationDoses:[]});
    await f.whenStable();return f;
  }
  for(const [type,button,filePrefix] of [['participants','.export-participants','senderistas'],['servers','.export-servers','servidores']] as const) {
    it(`exports all ${type} from the viewed archived retreat with complete document links`,async()=>{
      const f=await render();f.componentInstance.activeTab=type;f.changeDetectorRef.markForCheck();f.detectChanges();
      f.nativeElement.querySelector(button).click();
      expect(download).toHaveBeenCalledTimes(1);
      const csv=await new Promise<string>(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.readAsText(blob!);});
      const [headers,...rows]=csv.replace(/^\uFEFF/,'').split('\r\n').map(line=>
        [...line.matchAll(/"((?:[^"]|"")*)"(?:;|$)/g)].map(match=>match[1].replace(/""/g,'"')));
      const name=filename;
      expect(name).toMatch(new RegExp(`^${filePrefix}-reto-historico-3-\\d{4}-\\d{2}-\\d{2}\\.csv$`));
      expect(rows.length).toBe(26);expect(rows.every(row=>row.length===headers.length)).toBe(true);
      const value=(row:number,column:string)=>rows[row][headers.indexOf(column)];
      expect(value(0,'Nombre')).toBe('Persona 00');expect(value(25,'Nombre')).toBe('Persona 25');
      expect(value(0,'ID evento')).toBe(event.id);
      expect(value(0,'URL comprobante')).toBe(`${environment.apiUrl.replace(/\/api\/?$/,'')}/uploads/receipt.pdf`);
      expect(value(1,'URL comprobante')).toBe('https://files.example.test/receipt.pdf');
      expect(value(0,'URL acuerdo de participación')).toBe(`${environment.r2PublicUrl.replace(/\/$/,'')}/pdfs/${event.id}/qr-0.pdf`);
      expect(value(0,'Edad')).toMatch(/^\d+$/);expect(value(0,'Creado')).toBe(people[0].createdAt);
      expect(value(0,'Actualizado')).toBe(people[0].updatedAt);
      if(type==='participants') {
        expect(value(0,'Padecimientos')).toBe('Asma');expect(value(0,'Contacto de emergencia')).toBe('Contacto de emergencia');
        expect(value(0,'Teléfono de emergencia')).toBe('87777777');expect(value(0,'Medicamentos (JSON)')).toContain('08:00,20:00');
      } else {
        expect(value(0,'Estado de aprobación')).toBe('Aprobado');expect(value(0,'Correo del líder')).toBe('leader@example.test');
        expect(rows.flat()).not.toContain('private-approval-token');
      }
      // The download never reactivates the event or writes data to the API.
      http.expectNone(request=>request.method!=='GET');
    });
    it(`disables export when the archived ${type} list is empty`,async()=>{
      const f=await render(true);f.componentInstance.activeTab=type;f.changeDetectorRef.markForCheck();f.detectChanges();
      const element:HTMLButtonElement=f.nativeElement.querySelector(button);expect(element.disabled).toBe(true);element.click();
      expect(download).not.toHaveBeenCalled();
    });
  }
});
