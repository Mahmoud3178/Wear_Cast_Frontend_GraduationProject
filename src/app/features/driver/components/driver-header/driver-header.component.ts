import { Component, inject, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-driver-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './driver-header.component.html',
  styleUrl: './driver-header.component.css'
})
export class DriverHeaderComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  
  @Output() toggleSidebar = new EventEmitter<void>();
  
  userName = 'Driver';
  isSearchFocused = false;

  ngOnInit(): void {
    const profile = this.authService.getCustomerProfile();
    if (profile && profile.firstName) {
      this.userName = `${profile.firstName} ${profile.lastName || ''}`.trim();
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
