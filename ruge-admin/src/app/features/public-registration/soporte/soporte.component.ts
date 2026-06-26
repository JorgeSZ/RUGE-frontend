import { Component } from '@angular/core';

@Component({
  selector: 'app-soporte',
  templateUrl: './soporte.component.html',
  styleUrls: ['./soporte.component.css'],
  standalone: false
})
export class SoporteComponent {
  readonly email = 'software@retoruge.com';
  readonly phoneDisplay = '+506 6234-8953';
  readonly phoneTel = '+50662348953';
  readonly whatsappUrl = 'https://wa.me/50662348953';
}
