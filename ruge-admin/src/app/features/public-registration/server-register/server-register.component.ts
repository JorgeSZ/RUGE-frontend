import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ServerService } from '../../../core/services/server.service';
import { CommissionService } from '../../../core/services/commission.service';
import { Commission } from '../../../core/models/commission.model';

const MARITAL_STATUSES = ['Soltero/a', 'Casado/a', 'Divorciado/a', 'Viudo/a', 'Unión libre'];

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
  maritalStatuses = MARITAL_STATUSES;
  commissions: Commission[] = [];

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
      secondLastName: [''],
      cedula: [''],
      birthDate: [''],
      email: ['', [Validators.email]],
      phone: [''],
      church: [''],
      maritalStatus: [''],
      country: [''],
      commissionId: [''],
      hasDiscipleship: [false],
      hasDiscipleshipPatch: [false],
      hasGroup: [false],
    });
  }

  ngOnInit(): void {
    this.eventId = this.route.snapshot.paramMap.get('eventId') ?? '';
    this.commissionService.getAll().subscribe(c => this.commissions = c);
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
