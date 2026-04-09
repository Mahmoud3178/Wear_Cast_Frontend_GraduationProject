import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-factory-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './factory-layout.component.html',
  styleUrl: './factory-layout.component.css'
})
export class FactoryLayoutComponent {
  constructor(private readonly auth: AuthService) {}

  logout(): void {
    this.auth.logoutFactory();
  }
}
