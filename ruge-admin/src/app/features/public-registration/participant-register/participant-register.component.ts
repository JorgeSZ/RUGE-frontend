import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ParticipantService } from '../../../core/services/participant.service';

const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const MARITAL_STATUSES = ['Soltero/a', 'Casado/a', 'Divorciado/a', 'Viudo/a', 'Unión libre'];

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
      cedula: [''],
      birthDate: [''],
      email: ['', [Validators.email]],
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
