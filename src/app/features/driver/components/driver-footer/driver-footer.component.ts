import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-driver-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './driver-footer.component.html',
  styleUrl: './driver-footer.component.css'
})
export class DriverFooterComponent {
  year = new Date().getFullYear();
}
