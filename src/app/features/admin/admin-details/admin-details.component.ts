import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HandelAdminsForAdminService } from '../../../core/services/handel-admins-for-admin.service';

@Component({
  selector: 'app-admin-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-details.component.html',
  styleUrl: './admin-details.component.css'
})
export class AdminDetailsComponent implements OnInit {

  id: string = '';
  admin: any = {};

  // 🔥 نفس الماب بتاع add
  roleMap: any = {
    SuperAdmin: 16,
    OperationsAdmin: 1,
    CustomerServiceAdmin: 8,
    VendorAdmin: 2,
    CatalogAdmin: 4
  };

  constructor(
    private route: ActivatedRoute,
    private service: HandelAdminsForAdminService
  ) {}

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.loadAdmin();
  }

loadAdmin() {
  this.service.getAdminById(this.id).subscribe((res: any) => {

    const data = res?.data || res;

    // 🔥 تقسيم الاسم
    const names = data.fullName?.split(' ') || [];

    this.admin = {
      ...data,
      firstName: names[0] || '',
      lastName: names.slice(1).join(' ') || ''
    };

    console.log('DETAILS 👉', this.admin);
  });
}

  update() {

    const body = {
      firstName: this.admin.firstName,
      lastName: this.admin.lastName,
      email: this.admin.email,
      phoneNumber: this.admin.phoneNumber,

      // 🔥 نحول role → رقم
      role: this.roleMap[this.admin.role]
    };

    this.service.updateAdmin(this.id, body).subscribe({
      next: () => alert('✅ Updated successfully'),
      error: (err) => {
        console.log(err);
        alert('❌ Update failed');
      }
    });
  }
}
