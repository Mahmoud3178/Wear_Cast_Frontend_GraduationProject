import { Component } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css'
})
export class AdminLayoutComponent {

  constructor(private router: Router) {}

  logout() {
    // 🔥 امسح التوكن واليوزر
    localStorage.removeItem('user');
    localStorage.removeItem('token');

    // 🔥 روح للوجين
    this.router.navigate(['/admin/login']);
  }
}
