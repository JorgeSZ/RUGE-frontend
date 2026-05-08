import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ParticipantService } from '../../../core/services/participant.service';

const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const MARITAL_STATUSES = ['Soltero', 'Casado', 'Divorciado', 'Viudo', 'Unión libre'];

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
    private participantService: ParticipantService
  ) {
    this.form = this.fb.group({
      firstName: ['', [Validators.required]],
      firstLastName: ['', [Validators.required]],
      secondLastName: [''],
      cedula: ['', [Validators.required, Validators.maxLength(20)]],
      birthDate: [''],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      church: [''],
      shirtSize: [''],
      maritalStatus: [''],
      country: [''],
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

  submit(): void {
    if (this.form.invalid || !this.eventId) return;

    this.loading = true;
    this.error = '';

    const fd = new FormData();
    const val = this.form.value;
    Object.entries(val).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') fd.append(k, v as string);
    });
    if (this.selectedFile) fd.append('comprobante', this.selectedFile);

    this.participantService.registerPublic(this.eventId, fd).subscribe({
      next: result => {
        this.loading = false;
        this.router.navigate(['/registro/confirmacion'], {
          state: { result, type: 'Senderista' }
        });
      },
      error: err => {
        this.loading = false;
        this.error = err.error?.error ?? 'Error al registrar. Intenta nuevamente.';
      }
    });
  }
}
