import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ParticipantService } from '../../../core/services/participant.service';

const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const MARITAL_STATUSES = ['Soltero', 'Casado', 'Divorciado', 'Viudo', 'Unión libre'];

export interface MedRow { nombre: string; dosis: string; horario: string; notas: string; }

@Component({
  selector: 'app-participant-register',
  templateUrl: './participant-register.component.html',
  styleUrls: ['./participant-register.component.css'],
  standalone: false
})
export class ParticipantRegisterComponent implements OnInit {
  form: FormGroup;
  eventId = '';
  loading = false;
  error = '';
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  shirtSizes = SHIRT_SIZES;
  maritalStatuses = MARITAL_STATUSES;

  // Medications
  tomaMedicamentos = false;
  medications: MedRow[] = [];

  readonly years = Array.from({length: new Date().getFullYear() - 1929}, (_, i) => String(new Date().getFullYear() - i));
  readonly months = [
    {v:'01',l:'Enero'},{v:'02',l:'Febrero'},{v:'03',l:'Marzo'},{v:'04',l:'Abril'},
    {v:'05',l:'Mayo'},{v:'06',l:'Junio'},{v:'07',l:'Julio'},{v:'08',l:'Agosto'},
    {v:'09',l:'Septiembre'},{v:'10',l:'Octubre'},{v:'11',l:'Noviembre'},{v:'12',l:'Diciembre'},
  ];
  bdYear = ''; bdMonth = ''; bdDay = '';

  get bdDays(): string[] {
    if (!this.bdYear || !this.bdMonth) return Array.from({length: 31}, (_, i) => String(i + 1));
    return Array.from({length: new Date(+this.bdYear, +this.bdMonth, 0).getDate()}, (_, i) => String(i + 1));
  }

  onBdChange(): void {
    if (this.bdYear && this.bdMonth && this.bdDay) {
      if (+this.bdDay > this.bdDays.length) this.bdDay = '';
    }
    const v = (this.bdYear && this.bdMonth && this.bdDay)
      ? `${this.bdYear}-${this.bdMonth}-${this.bdDay.padStart(2,'0')}`
      : '';
    this.form.patchValue({birthDate: v});
  }

  // Church conditional
  get asistesIglesia(): boolean { return !!this.form.get('asistesIglesia')?.value; }
  get churchValue(): string { return this.form.get('church')?.value ?? ''; }
  get showImpactFields(): boolean { return this.asistesIglesia && /impact/i.test(this.churchValue); }
  get perteneceGrupo(): boolean { return !!this.form.get('perteneceGrupo')?.value; }

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private participantService: ParticipantService
  ) {
    this.form = this.fb.group({
      firstName:          ['', [Validators.required]],
      firstLastName:      ['', [Validators.required]],
      secondLastName:     [''],
      cedula:             ['', [Validators.required, Validators.maxLength(20)]],
      nombrePreferido:    [''],
      birthDate:          [''],
      email:              ['', [Validators.required, Validators.email]],
      phone:              [''],
      asistesIglesia:     [false],
      church:             [''],
      perteneceGrupo:     [false],
      nombreLiderGrupo:   [''],
      telefonoLiderGrupo: [''],
      shirtSize:          [''],
      maritalStatus:      [''],
      country:            [''],
    });

    // React to asistesIglesia changes
    this.form.get('asistesIglesia')?.valueChanges.subscribe(val => {
      if (!val) {
        this.form.patchValue({ church: '', perteneceGrupo: false, nombreLiderGrupo: '', telefonoLiderGrupo: '' });
      }
    });

    // React to perteneceGrupo changes
    this.form.get('perteneceGrupo')?.valueChanges.subscribe(val => {
      if (!val) {
        this.form.patchValue({ nombreLiderGrupo: '', telefonoLiderGrupo: '' });
      }
    });
  }

  ngOnInit(): void {
    this.eventId = this.route.snapshot.paramMap.get('eventId') ?? '';
  }

  get age(): number | null {
    const bd = this.form.get('birthDate')?.value;
    if (!bd) return null;
    return Math.floor((Date.now() - new Date(bd).getTime()) / (365.25 * 24 * 3600 * 1000));
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = e => this.previewUrl = e.target?.result as string;
      reader.readAsDataURL(this.selectedFile);
    }
  }

  toggleMedicamentos(): void {
    this.tomaMedicamentos = !this.tomaMedicamentos;
    if (this.tomaMedicamentos && this.medications.length === 0) this.addMed();
    if (!this.tomaMedicamentos) this.medications = [];
  }

  addMed(): void {
    if (this.medications.length < 10)
      this.medications.push({ nombre: '', dosis: '', horario: '', notas: '' });
  }

  removeMed(i: number): void { this.medications.splice(i, 1); }

  get medsValid(): boolean {
    if (!this.tomaMedicamentos) return true;
    return this.medications.length > 0 && this.medications.every(m => !!m.nombre.trim());
  }

  submit(): void {
    if (this.form.invalid || !this.eventId || !this.medsValid) return;

    this.loading = true;
    this.error = '';

    const fd = new FormData();
    const val = this.form.value;
    Object.entries(val).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '' && v !== false) fd.append(k, String(v));
      if (v === true) fd.append(k, 'true');
    });
    if (this.selectedFile) fd.append('comprobante', this.selectedFile);

    if (this.tomaMedicamentos && this.medications.length > 0) {
      fd.append('medicamentosJson', JSON.stringify(this.medications.map(m => ({
        nombreMedicamento: m.nombre,
        dosis: m.dosis || null,
        horario: m.horario || null,
        notas: m.notas || null,
      }))));
    }

    this.participantService.registerPublic(this.eventId, fd).subscribe({
      next: result => {
        this.loading = false;
        this.router.navigate(['/registro/confirmacion'], { state: { result, type: 'Senderista' } });
      },
      error: err => {
        this.loading = false;
        this.error = err.error?.error ?? 'Error al registrar. Intenta nuevamente.';
      }
    });
  }
}
