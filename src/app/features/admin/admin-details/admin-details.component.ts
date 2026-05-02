import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HandelAdminsForAdminService } from '../../../core/services/handel-admins-for-admin.service';

@Component({
  selector: 'app-admin-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-details.component.html'
})
export class AdminDetailsComponent implements OnInit {

  id: string = '';

  admin: any = {};

  constructor(
    private route: ActivatedRoute,
    private service: HandelAdminsForAdminService
  ) {}

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.loadProfile();
  }

loadProfile() {
  this.service.getAdminProfile().subscribe((res: any) => {

    console.log(res); // شوف الشكل

    this.admin = res.data; // ✅ الصح

  });
}

update() {
  const body = {
    firstName: this.admin.firstName,
    lastName: this.admin.lastName,
    email: this.admin.email,
    phoneNumber: this.admin.phoneNumber,
    role: this.admin.role
  };

  this.service.updateAdmin(this.id, body)
    .subscribe(() => alert('Updated'));
}
}
