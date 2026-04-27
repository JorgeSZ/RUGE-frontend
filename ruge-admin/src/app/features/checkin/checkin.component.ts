import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CheckInService, QrCheckInResponse, CheckInSummaryResponse } from '../../core/services/checkin.service';
import { environment } from '../../../environments/environment';
import jsQR from 'jsqr';

type ResultState = 'success' | 'already' | 'error' | null;

@Component({
  selector: 'app-checkin',
  templateUrl: './checkin.component.html',
  styleUrls: ['./checkin.component.css'],
  standalone: false
})
export class CheckinComponent implements OnInit, OnDestroy {
  eventId = '';
  pinForm: FormGroup;
  scanForm: FormGroup;
  pinVerified = false;
  loading = false;

  result: QrCheckInResponse | null = null;
  resultState: ResultState = null;
  errorMsg = '';

  summary: CheckInSummaryResponse | null = null;

  // Camera
  showCamera = false;
  cameraActive = false;
  cameraError = '';
  cameraFlash: 'success' | 'error' | null = null;
  cardFlash: 'success' | 'error' | null = null;
  private stream: MediaStream | null = null;
  private animFrame: number | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private canvasEl: HTMLCanvasElement | null = null;

  @ViewChild('videoRef') set videoRef(el: ElementRef<HTMLVideoElement> | undefined) {
    this.videoEl = el?.nativeElement ?? null;
  }
  @ViewChild('canvasRef') set canvasRef(el: ElementRef<HTMLCanvasElement> | undefined) {
    this.canvasEl = el?.nativeElement ?? null;
  }

  private clearTimer: any;
  private summaryInterval: any;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private checkInService: CheckInService,
    private cdr: ChangeDetectorRef
  ) {
    this.pinForm = this.fb.group({
      pin: ['', [Validators.required, Validators.minLength(4)]],
    });
    this.scanForm = this.fb.group({
      token: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.eventId = this.route.snapshot.paramMap.get('eventId') ?? '';
    if (sessionStorage.getItem(`checkin_pin_${this.eventId}`) === 'ok') {
      this.pinVerified = true;
      this.loadSummary();
      this.startSummaryPolling();
    }
  }

  ngOnDestroy(): void {
    this.stopCamera();
    clearInterval(this.summaryInterval);
    clearTimeout(this.clearTimer);
  }

  verifyPin(): void {
    const pin = this.pinForm.value.pin;
    if (pin === environment.checkinPin) {
      this.pinVerified = true;
      sessionStorage.setItem(`checkin_pin_${this.eventId}`, 'ok');
      this.loadSummary();
      this.startSummaryPolling();
    } else {
      this.pinForm.get('pin')?.setErrors({ wrong: true });
    }
  }

  // Camera
  async toggleCamera(): Promise<void> {
    if (this.cameraActive) {
      this.stopCamera();
      this.showCamera = false;
    } else {
      this.showCamera = true;
      this.cameraError = '';
      this.cdr.detectChanges(); // render video element before accessing it
      await new Promise(r => setTimeout(r, 50)); // let Angular render
      await this.startCamera();
    }
  }

  private async startCamera(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      this.videoEl!.srcObject = this.stream;
      await this.videoEl!.play();
      this.cameraActive = true;
      this.cdr.detectChanges();
      this.scanLoop();
    } catch {
      this.cameraError = 'No se pudo acceder a la cámara. Verifica los permisos.';
      this.showCamera = false;
      this.cdr.detectChanges();
    }
  }

  stopCamera(): void {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.cameraActive = false;
    if (this.animFrame !== null) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
  }

  private async scanLoop(): Promise<void> {
    if (!this.cameraActive || !this.videoEl || !this.canvasEl) return;
    const video = this.videoEl;
    const canvas = this.canvasEl;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code?.data) {
        const token = this.extractToken(code.data);
        this.cameraFlash = 'success';
        this.cdr.detectChanges();
        await new Promise(r => setTimeout(r, 400));
        this.stopCamera();
        this.showCamera = false;
        this.cameraFlash = null;
        this.cdr.detectChanges();
        this.submitToken(token);
        return;
      }
    }

    this.animFrame = requestAnimationFrame(() => this.scanLoop());
  }

  private extractToken(raw: string): string {
    // QR content format: "RUGE:{eventId}:{token}"
    if (raw.startsWith('RUGE:')) {
      const parts = raw.split(':');
      if (parts.length === 3) return parts[2];
    }
    return raw.trim();
  }

  processCheckIn(): void {
    if (this.scanForm.invalid || !this.eventId) return;
    this.submitToken(this.scanForm.value.token.trim());
  }

  private submitToken(token: string): void {
    this.loading = true;
    this.clearResult();
    this.scanForm.reset();

    this.checkInService.checkIn(this.eventId, token).subscribe({
      next: res => {
        this.loading = false;
        this.result = res;
        this.resultState = res.alreadyCheckedIn ? 'already' : 'success';
        this.triggerCardFlash(res.alreadyCheckedIn ? 'error' : 'success');
        if (!res.alreadyCheckedIn) {
          this.updateSummaryCounter(res.tipo);
          this.playSound('success');
        } else {
          this.playSound('warning');
        }
        this.scheduleAutoClear(3000);
        this.cdr.detectChanges();
      },
      error: err => {
        this.loading = false;
        this.errorMsg = err.error?.error ?? 'QR no válido o no pertenece a este evento.';
        this.resultState = 'error';
        this.triggerCardFlash('error');
        this.playSound('error');
        this.scheduleAutoClear(2000);
        this.cdr.detectChanges();
      }
    });
  }

  clearResult(): void {
    clearTimeout(this.clearTimer);
    this.result = null;
    this.resultState = null;
    this.errorMsg = '';
  }

  private scheduleAutoClear(ms: number): void {
    clearTimeout(this.clearTimer);
    this.clearTimer = setTimeout(() => {
      this.clearResult();
      this.cdr.detectChanges();
    }, ms);
  }

  private loadSummary(): void {
    this.checkInService.getSummary(this.eventId).subscribe({
      next: s => { this.summary = s; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  private startSummaryPolling(): void {
    this.summaryInterval = setInterval(() => this.loadSummary(), 30000);
  }

  private updateSummaryCounter(tipo: string): void {
    if (!this.summary) return;
    if (tipo === 'Senderista') {
      this.summary = { ...this.summary, senderistasCheckIn: this.summary.senderistasCheckIn + 1 };
    } else {
      this.summary = { ...this.summary, servidoresCheckIn: this.summary.servidoresCheckIn + 1 };
    }
  }

  private triggerCardFlash(type: 'success' | 'error'): void {
    this.cardFlash = type;
    setTimeout(() => { this.cardFlash = null; this.cdr.detectChanges(); }, 700);
  }

  formatTime(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  }

  private playSound(type: 'success' | 'warning' | 'error'): void {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      } else if (type === 'warning') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      }
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch { /* AudioContext not available */ }
  }
}
