import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-registration-success',
  templateUrl: './registration-success.component.html',
  styleUrls: ['./registration-success.component.css'],
  standalone: false
})
export class RegistrationSuccessComponent implements OnInit {
  result: any = null;
  type = '';

  constructor(private router: Router) {}

  ngOnInit(): void {
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state ?? history.state;
    this.result = state?.['result'];
    this.type = state?.['type'] ?? '';

    if (!this.result) {
      this.router.navigate(['/']);
    }
  }

  downloadQr(): void {
    if (!this.result?.qrImageUrl) return;
    const a = document.createElement('a');
    a.href = this.result.qrImageUrl;
    a.download = `qr-${this.result.id}.png`;
    a.click();
  }
}
