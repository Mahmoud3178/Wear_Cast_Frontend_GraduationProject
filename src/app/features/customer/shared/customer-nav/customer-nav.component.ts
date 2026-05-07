import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-customer-nav',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './customer-nav.component.html',
  styleUrl: './customer-nav.component.css'
})
export class CustomerNavComponent {
  searchTerm = '';
  isMobileMenuOpen = false;

  constructor(
    readonly auth: AuthService,
    private readonly router: Router
  ) {}

  signOut(): void {
    this.auth.logout();
  }

  runSearch(): void {
    const q = this.searchTerm.trim();
    this.router.navigate(['/customer/category'], {
      queryParams: q ? { q } : {}
    });
    this.isMobileMenuOpen = false;
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }
}

