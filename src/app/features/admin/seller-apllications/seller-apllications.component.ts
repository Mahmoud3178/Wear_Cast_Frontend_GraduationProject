import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SellerApllicationsService } from '../../../core/services/seller-apllications.service';

@Component({
  selector: 'app-seller-apllications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './seller-apllications.component.html',
  styleUrl: './seller-apllications.component.css'
})
export class SellerApllicationsComponent implements OnInit {
  applications: any[] = [];
  filteredApplications: any[] = [];

  selectedApplication: any = null;

  showDrawer = false;
  rejectMode = false;
  rejectReason = '';
  // 🔥 جديد
  searchTerm: string = '';
  selectedStatus: string | null = null;
  constructor(private service: SellerApllicationsService) {}

  ngOnInit() {
    this.load();
  }

  // 🔹 GET ALL
  load() {
    this.service.getAll().subscribe((res: any) => {
      this.applications = res?.items || res?.data?.items || [];

         this.applyFilters();
    });
  }
applyFilters() {
    this.filteredApplications = this.applications.filter(app => {

      const matchStatus =
        !this.selectedStatus || app.status === this.selectedStatus;

      const matchSearch =
        !this.searchTerm ||
        app.sellerName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        app.sellerEmail?.toLowerCase().includes(this.searchTerm.toLowerCase());

      return matchStatus && matchSearch;
    });
  }
   onSearch() {
    this.applyFilters();
  }

  setStatus(status: string | null) {
    this.selectedStatus = status;
    this.applyFilters();
  }
  // 🔹 OPEN DETAILS
  open(app: any) {
    this.service.getById(app.id).subscribe((res: any) => {

      this.selectedApplication = res?.data || res;

      this.showDrawer = true;
      this.rejectMode = false;
      this.rejectReason = '';

      console.log('DETAILS 👉', this.selectedApplication);
    });
  }

  close() {
    this.showDrawer = false;
  }

  // 🔹 APPROVE
  approve() {
    const email = this.selectedApplication?.sellerEmail;

    if (!email) {
      alert('Email not found ❌');
      return;
    }

    this.service.approve(email).subscribe({
      next: () => {
        this.close();
        this.load();
      },
      error: (err) => {
        alert(err?.error?.error?.description || 'Error ❌');
      }
    });
  }

  // 🔹 ENABLE REJECT
  enableReject() {
    this.rejectMode = true;
  }

  // 🔹 REJECT
  reject() {
    const email = this.selectedApplication?.sellerEmail;

    if (!email) {
      alert('Email not found ❌');
      return;
    }

    this.service.reject(email, this.rejectReason).subscribe({
      next: () => {
        this.close();
        this.load();
      },
      error: (err) => {
        alert(err?.error?.error?.description || 'Error ❌');
      }
    });
  }
}
