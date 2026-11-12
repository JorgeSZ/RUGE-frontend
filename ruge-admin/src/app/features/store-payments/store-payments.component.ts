import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({ selector: 'app-store-payments', templateUrl: './store-payments.component.html', styleUrls: ['./store-payments.component.css'], standalone: false })
export class StorePaymentsComponent implements OnInit {
  rows: any[] = [];
  selectedFile: File | null = null;
  loading = false;
  saving = false;
  message = '';
  readonly form;
  get isRegistrar(): boolean { return this.auth.hasRole('Registrador'); }

  constructor(private api: ApiService, private auth: AuthService, fb: FormBuilder, private cdr: ChangeDetectorRef) {
    this.form = fb.group({ payerFirstName: ['', Validators.required], payerLastName: ['', Validators.required], payerPhone: ['', Validators.required], payerEmail: ['', [Validators.required, Validators.email]], amount: [null, [Validators.required, Validators.min(0.01)]], reference: ['', [Validators.required, Validators.maxLength(100)]] });
  }

  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading = true;
    this.api.get<any[]>(`/store-payments${this.isRegistrar ? '/mine' : ''}`).pipe(finalize(() => { this.loading = false; this.cdr.detectChanges(); }))
      .subscribe({ next: rows => { this.rows = rows; }, error: () => this.message = 'No se pudo cargar la información.' });
  }
  onFile(event: Event): void { this.selectedFile = (event.target as HTMLInputElement).files?.[0] ?? null; }
  submit(): void {
    if (this.form.invalid || !this.selectedFile || this.saving) { this.message = 'Completa el monto, referencia y adjunta el comprobante.'; return; }
    const body = new FormData(); body.append('file', this.selectedFile); body.append('amount', String(this.form.value.amount)); body.append('reference', this.form.value.reference ?? '');
    body.append('payerFirstName', this.form.value.payerFirstName ?? ''); body.append('payerLastName', this.form.value.payerLastName ?? ''); body.append('payerPhone', this.form.value.payerPhone ?? ''); body.append('payerEmail', this.form.value.payerEmail ?? '');
    this.saving = true;
    this.api.post<any>('/store-payments', body).pipe(finalize(() => { this.saving = false; this.cdr.detectChanges(); }))
      .subscribe({ next: () => { this.message = 'Comprobante enviado. El envío quedó registrado.'; this.form.reset(); this.selectedFile = null; this.load(); }, error: err => this.message = err?.error?.error ?? 'No se pudo enviar el comprobante.' });
  }
  changeStatus(row: any, status: string): void {
    this.api.patch<void>(`/store-payments/${row.id}/status`, { status }).subscribe({ next: () => this.load(), error: () => this.message = 'No se pudo actualizar el estado.' });
  }
}
