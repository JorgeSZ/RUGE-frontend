import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApprovalService, ApprovalInfo } from '../../core/services/approval.service';

type PageState = 'loading' | 'pending' | 'already' | 'success' | 'error';

@Component({
  selector: 'app-approval',
  templateUrl: './approval.component.html',
  styleUrls: ['./approval.component.css'],
  standalone: false
})
export class ApprovalComponent implements OnInit {
  token = '';
  info: ApprovalInfo | null = null;
  state: PageState = 'loading';
  errorMsg = '';

  // Dialog state
  showDialog = false;
  pendingAction: 'approve' | 'deny' | null = null;
  submitting = false;

  // Result state
  resultAction: 'approve' | 'deny' | null = null;
  resultNombre = '';
  resultEvento = '';

  constructor(
    private route: ActivatedRoute,
    private approvalService: ApprovalService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    const actionParam = this.route.snapshot.queryParamMap.get('action');

    this.approvalService.getInfo(this.token).subscribe({
      next: info => {
        this.info = info;
        this.state = info.alreadyProcessed ? 'already' : 'pending';

        if (!info.alreadyProcessed && (actionParam === 'approve' || actionParam === 'deny')) {
          this.pendingAction = actionParam;
          this.showDialog = true;
        }
        this.cdr.detectChanges();
      },
      error: err => {
        this.errorMsg = err.error?.error ?? 'Este link no es válido o ha expirado.';
        this.state = 'error';
        this.cdr.detectChanges();
      }
    });
  }

  openDialog(action: 'approve' | 'deny'): void {
    this.pendingAction = action;
    this.showDialog = true;
  }

  cancelDialog(): void {
    this.showDialog = false;
    this.pendingAction = null;
  }

  confirm(): void {
    if (!this.pendingAction) return;
    this.submitting = true;

    this.approvalService.process(this.token, this.pendingAction).subscribe({
      next: result => {
        this.resultAction  = this.pendingAction;
        this.resultNombre  = result.nombreServidor;
        this.resultEvento  = result.nombreEvento;
        this.showDialog    = false;
        this.submitting    = false;
        this.state         = 'success';
        this.cdr.detectChanges();
      },
      error: err => {
        this.submitting = false;
        this.showDialog = false;
        this.errorMsg   = err.error?.error ?? 'Ocurrió un error. Intenta nuevamente.';
        if (err.status === 409) {
          this.info = { ...this.info!, alreadyProcessed: true, currentStatus: err.error?.currentStatus ?? this.info!.currentStatus };
          this.state = 'already';
        } else {
          this.state = 'error';
        }
        this.cdr.detectChanges();
      }
    });
  }

  get actionLabel(): string {
    return this.pendingAction === 'approve' ? 'APROBAR' : 'DENEGAR';
  }

  get statusLabel(): string {
    if (!this.info) return '';
    const map: Record<string, string> = { Pendiente: 'Pendiente', Aprobado: 'Aprobado', Denegado: 'Denegado' };
    return map[this.info.currentStatus] ?? this.info.currentStatus;
  }
}
