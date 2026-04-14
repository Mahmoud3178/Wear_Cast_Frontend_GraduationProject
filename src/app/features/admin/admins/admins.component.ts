import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-admins',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admins.component.html',
  styleUrl: './admins.component.css'
})
export class AdminsComponent {

constructor(
  private router: Router,
  private route: ActivatedRoute
) {}


  admins = [
    {
      id: 1,
      name: 'Sarah Jenkins',
      email: 'sarah@clothify.com',
      role: 'Super Admin'
    },
    {
      id: 2,
      name: 'Michael Chen',
      email: 'michael@clothify.com',
      role: 'Manager'
    },
    {
      id: 3,
      name: 'Emily Davis',
      email: 'emily@clothify.com',
      role: 'Moderator'
    }
  ];

goToDetails(id: number) {
  this.router.navigate([id], { relativeTo: this.route });
}

goToAdd() {
  this.router.navigate(['add'], { relativeTo: this.route });
}
}
