import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HandelAdminsForAdminService } from '../../../core/services/handel-admins-for-admin.service';
import { ToastService } from '../../../core/services/toast.service';

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
  loading = false;

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
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.loadAdmins();
  }

  loadAdmins() {
    this.service.getAdmins().subscribe((res: any) => {
      this.admins = Array.isArray(res?.items) ? res.items : [];
    });
  }

  goToDetails(id: string) {
    this.router.navigate(['/admin/admins', id]);
  }

  toggleAdd() {
    this.showAdd = !this.showAdd;
    if (!this.showAdd) this.reset();
  }

  addAdmin() {
    if (!this.newAdmin.firstName || !this.newAdmin.email || !this.newAdmin.role) {
      this.toast.warning('Please fill in all required fields.');
      return;
    }

    if (this.newAdmin.password !== this.newAdmin.confirmPassword) {
      this.toast.error('Passwords do not match.');
      return;
    }

    this.loading = true;
    const body = {
      FirstName: this.newAdmin.firstName,
      LastName: this.newAdmin.lastName,
      Email: this.newAdmin.email,
      Password: this.newAdmin.password,
      ConfirmPassword: this.newAdmin.confirmPassword,
      PhoneNumber: this.newAdmin.phoneNumber,
      Role: this.roleMap[this.newAdmin.role]
    };

    this.service.addAdmin(body).subscribe({
      next: () => {
        this.loading = false;
        this.loadAdmins();
        this.toggleAdd();
        this.toast.success('Admin added successfully.');
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(err?.error?.message || 'Failed to add admin.');
      }
    });
  }

  deleteAdmin(id: string) {
    if (!confirm('Are you sure you want to delete this admin?')) return;

    this.service.deleteAdmin(id).subscribe({
      next: () => {
        this.loadAdmins();
        this.toast.success('Admin removed successfully.');
      },
      error: (err) => {
        if (err.error?.code === 'Admin.CannotDeleteSuperAdmin') {
          this.toast.error('Cannot delete a Super Admin account.');
        } else {
          this.toast.error('Failed to delete admin.');
        }
      }
    });
  }

  getRoleClass(role: string): string {
    const map: any = {
      SuperAdmin: 'role-super',
      OperationsAdmin: 'role-ops',
      CustomerServiceAdmin: 'role-cs',
      VendorAdmin: 'role-vendor',
      CatalogAdmin: 'role-catalog'
    };
    return map[role] || '';
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
