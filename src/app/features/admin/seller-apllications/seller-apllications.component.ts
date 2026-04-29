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
  selectedApplication: any = null;

  showDrawer = false;
  rejectMode = false;
  rejectReason = '';

  constructor(private service: SellerApllicationsService) {}

  ngOnInit() {
    this.load();
  }

  // 🔹 GET ALL
  load() {
    this.service.getAll().subscribe((res: any) => {
      this.applications = res?.items || res?.data?.items || [];
    });
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
