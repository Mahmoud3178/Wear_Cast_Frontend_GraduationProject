import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-factory-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIf],
  templateUrl: './factory-layout.component.html',
  styleUrl: './factory-layout.component.css'
})
export class FactoryLayoutComponent {
  constructor(private readonly auth: AuthService) {}

  /** Only main factory account can create managers, not factory managers */
  get isFactory(): boolean {
    const roles = this.auth.getUserRoles();
    return roles.includes('Factory') || roles.includes('factory');
  }

  logout(): void {
    this.auth.logoutFactory();
  }
}
