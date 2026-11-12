import { CommonModule } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ParticipantRegisterComponent } from './participant-register.component';

describe('Participant registration history', () => {
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/public/events/event-1`;
  const warning = 'Esta cédula ya ha sido registrada como senderista en RUGE.';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, ReactiveFormsModule],
      declarations: [ParticipantRegisterComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ eventId: 'event-1' }) } } },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } }
      ]
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function screen(open = true) {
    const fixture = TestBed.createComponent(ParticipantRegisterComponent);
    fixture.detectChanges();
    http.expectOne(`${base}/registration-status`).flush({ participantRegistrationEnabled: open, serverRegistrationEnabled: true });
    return fixture;
  }

  function completeForm(component: ParticipantRegisterComponent) {
    component.form.patchValue({
      cedula: '1-2345-6789', firstName: 'Prueba', firstLastName: 'Apellido', secondLastName: 'Segundo',
      nombrePreferido: 'Prueba', birthDate: '1990-01-01', email: 'prueba@example.com', phone: '88888888',
      emergencyContactName: 'Contacto', emergencyContactPhone: '88888889', shirtSize: 'M', maritalStatus: 'Soltero',
      country: 'Costa Rica', privacyConsentAccepted: true
    });
    component.selectedFile = new File(['receipt'], 'receipt.png', { type: 'image/png' });
  }

  it('shows the duplicate warning immediately and prevents submission even with a complete form', async () => {
    const fixture = screen();
    completeForm(fixture.componentInstance);
    fixture.componentInstance.checkDocument();
    http.expectOne(`${base}/registration-history/participant`).flush({ blocked: true, message: warning });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#document-check [role="alert"]').textContent).toContain(warning);
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    fixture.componentInstance.submit();
    http.expectNone(`${base}/senderistas/register`);
  });

  it('cancels a pending response when the document changes and does not reuse the old result', async () => {
    const fixture = screen();
    const component = fixture.componentInstance;
    component.form.get('cedula')!.setValue('123456789');
    component.checkDocument();
    const old = http.expectOne(`${base}/registration-history/participant`);
    component.form.get('cedula')!.setValue('987654321');
    expect(old.cancelled).toBe(true);
    expect(component.documentVerified).toBe(false);
    component.checkDocument();
    http.expectOne(`${base}/registration-history/participant`).flush({ blocked: false, message: null });
    await fixture.whenStable();
    expect(component.documentVerified).toBe(true);
    expect(component.checkedDocument).toBe('987654321');
  });

  it('keeps submission disabled after a lookup failure and supports retry', async () => {
    const fixture = screen();
    completeForm(fixture.componentInstance);
    fixture.componentInstance.checkDocument();
    http.expectOne(`${base}/registration-history/participant`).flush({}, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    expect(fixture.componentInstance.checkingDocument).toBe(false);
    expect(fixture.componentInstance.documentVerified).toBe(false);
    fixture.nativeElement.querySelector('.document-retry').click();
    http.expectOne(`${base}/registration-history/participant`).flush({ blocked: false });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
  });

  it('handles a duplicate found by the API during final submission', async () => {
    const fixture = screen();
    completeForm(fixture.componentInstance);
    fixture.componentInstance.checkDocument();
    http.expectOne(`${base}/registration-history/participant`).flush({ blocked: false });
    fixture.componentInstance.submit();
    http.expectOne(`${base}/senderistas/register`).flush({ code: 'PARTICIPANT_ALREADY_REGISTERED', error: warning },
      { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(fixture.componentInstance.loading).toBe(false);
    expect(fixture.componentInstance.documentBlocked).toBe(true);
    expect(fixture.nativeElement.querySelector('#document-check [role="alert"]').textContent).toContain(warning);
  });

  it('does not query history for a closed event', () => {
    const fixture = screen(false);
    fixture.componentInstance.form.get('cedula')!.setValue('123456789');
    fixture.componentInstance.checkDocument();
    http.expectNone(`${base}/registration-history/participant`);
  });

  it('does not reuse an allowed check after changing the identity', () => {
    const fixture = screen();
    completeForm(fixture.componentInstance);
    fixture.componentInstance.checkDocument();
    http.expectOne(`${base}/registration-history/participant`).flush({ blocked: false });
    fixture.componentInstance.form.get('cedula')!.setValue('111111111');
    fixture.componentInstance.submit();
    http.expectOne(`${base}/registration-history/participant`).flush({ blocked: true, message: warning });
    http.expectNone(`${base}/senderistas/register`);
  });
});
