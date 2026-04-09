import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-customer-nav',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './customer-nav.component.html',
  styleUrl: './customer-nav.component.css'
})
export class CustomerNavComponent {
  constructor(readonly auth: AuthService) {}

  signOut(): void {
    this.auth.logout();
  }
}

