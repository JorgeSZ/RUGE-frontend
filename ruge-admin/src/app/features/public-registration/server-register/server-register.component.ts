import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ServerService } from '../../../core/services/server.service';
import { CommissionService } from '../../../core/services/commission.service';
import { Commission } from '../../../core/models/commission.model';

const MARITAL_STATUSES = ['Soltero', 'Casado', 'Divorciado', 'Viudo', 'Unión libre'];

@Component({
  selector: 'app-server-register',
  templateUrl: './server-register.component.html',
  styleUrls: ['./server-register.component.css'],
  standalone: false
})
export class ServerRegisterComponent implements OnInit {
  form: FormGroup;
  eventId = '';
  loading = false;
  error = '';
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  submitted = false;
  fileTouched = false;
  maritalStatuses = MARITAL_STATUSES;
  commissions: Commission[] = [];

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

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private serverService: ServerService,
    private commissionService: CommissionService
  ) {
    this.form = this.fb.group({
      firstName: ['', [Validators.required]],
      firstLastName: ['', [Validators.required]],
      secondLastName: ['', [Validators.required]],
      cedula: ['', [Validators.required, Validators.maxLength(20)]],
      birthDate: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      church: ['', [Validators.required]],
      maritalStatus: ['', [Validators.required]],
      country: ['', [Validators.required]],
      commissionId: ['', [Validators.required]],
      hasDiscipleship: [false],
      hasDiscipleshipPatch: [false],
      hasGroup: [false],
      estaEnNewLife: [false],
      modulo: [null],
      nombreLider: ['', [Validators.required]],
      telefonoLider: ['', [Validators.required]],
      emailLider: ['', [Validators.required, Validators.email]],
      confirmacionVeracidad: [false, [Validators.requiredTrue]],
    });

    this.form.get('estaEnNewLife')?.valueChanges.subscribe(val => {
      const moduloCtrl = this.form.get('modulo');
      if (val) {
        moduloCtrl?.setValidators([Validators.required]);
      } else {
        moduloCtrl?.clearValidators();
        moduloCtrl?.patchValue(null, { emitEvent: false });
      }
      moduloCtrl?.updateValueAndValidity({ emitEvent: false });
    });
  }

  readonly moduloOpciones = [1, 2, 3, 4, 5];

  ngOnInit(): void {
    this.eventId = this.route.snapshot.paramMap.get('eventId') ?? '';
    this.commissionService.getAll().subscribe(c => this.commissions = c);
  }

  get estaEnNewLife(): boolean { return !!this.form.get('estaEnNewLife')?.value; }

  get age(): number | null {
    const bd = this.form.get('birthDate')?.value;
    if (!bd) return null;
    return Math.floor((Date.now() - new Date(bd).getTime()) / (365.25 * 24 * 3600 * 1000));
  }

  onFileChange(event: Event): void {
    this.fileTouched = true;
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = e => this.previewUrl = e.target?.result as string;
      reader.readAsDataURL(this.selectedFile);
    }
  }

  submit(): void {
    this.submitted = true;
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.eventId || !this.selectedFile) return;

    this.loading = true;
    this.error = '';

    const fd = new FormData();
    const val = this.form.value;
    Object.entries(val).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') fd.append(k, String(v));
    });
    if (this.selectedFile) fd.append('comprobante', this.selectedFile);

    this.serverService.registerPublic(this.eventId, fd).subscribe({
      next: result => {
        this.loading = false;
        this.router.navigate(['/registro/confirmacion'], {
          state: { result, type: 'Servidor' }
        });
      },
      error: err => {
        this.loading = false;
        this.error = err.error?.error ?? 'Error al registrar. Intenta nuevamente.';
      }
    });
  }
}
