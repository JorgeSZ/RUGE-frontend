import { Component } from '@angular/core';

@Component({
  selector: 'app-soporte',
  templateUrl: './soporte.component.html',
  styleUrls: ['./soporte.component.css'],
  standalone: false
})
export class SoporteComponent {
  readonly email = 'software@retoruge.com';
  readonly phoneDisplay = '+506 8427-7806';
  readonly phoneTel = '+50684277806';
  readonly whatsappUrl = 'https://wa.me/50684277806';
}
