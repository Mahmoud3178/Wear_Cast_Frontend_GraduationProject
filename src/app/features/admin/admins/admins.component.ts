import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HandelAdminsForAdminService } from '../../../core/services/handel-admins-for-admin.service';

@Component({
  selector: 'app-admins',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admins.component.html',
  styleUrl: './admins.component.css'
})
export class AdminsComponent implements OnInit {

  admins: any[] = [];
  showAdd = false;

  roleMap: any = {
    SuperAdmin: 16,
    OperationsAdmin: 1,
    CustomerServiceAdmin: 8,
    VendorAdmin: 2,
    CatalogAdmin: 4
  };

  newAdmin = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    role: ''
  };

  constructor(
    private service: HandelAdminsForAdminService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadAdmins();
  }

  loadAdmins() {
    this.service.getAdmins().subscribe((res: any) => {

      if (Array.isArray(res?.items)) {
        this.admins = res.items;
      } else {
        this.admins = [];
      }

    });
  }

  goToDetails(id: string) {
    this.router.navigate(['/admin/admins', id]);
  }

  toggleAdd() {
    this.showAdd = !this.showAdd;
  }

  addAdmin() {

  if (this.newAdmin.password !== this.newAdmin.confirmPassword) {
    alert('Passwords not match');
    return;
  }

  const body = {
    FirstName: this.newAdmin.firstName,
    LastName: this.newAdmin.lastName,
    Email: this.newAdmin.email,
    Password: this.newAdmin.password,
    ConfirmPassword: this.newAdmin.confirmPassword,
    PhoneNumber: this.newAdmin.phoneNumber,
    Role: this.roleMap[this.newAdmin.role]
  };

  console.log(body); // 👈 مهم تشوف بيطلع ايه

  this.service.addAdmin(body).subscribe({
    next: () => {
      this.loadAdmins();
      this.toggleAdd();
      this.reset();
    },
    error: (err) => {
      console.log(err);
    }
  });
}

  deleteAdmin(id: string) {
    this.service.deleteAdmin(id).subscribe({
      next: () => this.loadAdmins(),
      error: (err) => {
        if (err.error?.code === 'Admin.CannotDeleteSuperAdmin') {
          alert('Cannot delete Super Admin');
        }
      }
    });
  }

  reset() {
    this.newAdmin = {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      phoneNumber: '',
      role: ''
    };
  }
}
