import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SallerProfileService } from '../../../core/services/saller-profile.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {

  constructor(private profileService: SallerProfileService) {}
walletPage = 1;
walletPageSize = 5;
  seller: any = {
    id: 0,
    name: '',
    registration: '',
    description: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: '',
    taxIdNumber: '',
    commercialRegisterNumber: '',
    buildingNumber: ''
  };

  currentPassword = '';
  newPassword = '';
  ConfirmNewPassword = '';

  logoPreview: string | ArrayBuffer | null = null;
  selectedFile: File | null = null;

  isLoading = false;

  wallet: any = null;
  walletLoading = false;
  walletError = '';

  ngOnInit(): void {
    this.loadProfile();
    this.loadWallet();
  }

  getSellerIdFromToken(): number {
    const token = localStorage.getItem('token');
    if (!token) return 0;

    const payload = JSON.parse(atob(token.split('.')[1]));
    return +payload.SellerId;
  }
loadProfile() {
  this.profileService.getMyProfile().subscribe({
    next: (res: any) => {
      const data = res.data;

      this.seller = {
        id: data.id,
        name: data.name,
        registration: data.commercialRegisterNumber,
        description: data.description,
        address: data.address?.street,
        city: data.address?.city,
        state: data.address?.state,
        zip: data.address?.buildingNumber,
        buildingNumber: data.address?.buildingNumber,
        phone: data.phoneNumber,
        email: data.email,
        taxIdNumber: data.taxIdNumber,
        commercialRegisterNumber: data.commercialRegisterNumber
      };

      this.logoPreview = data.logoUrl || null;
    },
    error: (err) => {
      console.log(err);
    }
  });
}

  onLogoChange(event: any) {
    const file = event.target.files[0];

    if (file) {
      this.selectedFile = file;

      const reader = new FileReader();
      reader.onload = () => {
        this.logoPreview = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  validateForm(): boolean {
    if (!this.seller.description || !this.seller.address || !this.seller.taxIdNumber) {
      alert('Please fill all required fields');
      return false;
    }
    return true;
  }

  saveChanges() {

    if (!this.validateForm()) return;

    this.isLoading = true;

    this.profileService.updateProfile(this.seller).subscribe({
      next: () => {
        if (this.selectedFile) {
          this.uploadLogo();
        } else {
          this.isLoading = false;
          alert('Profile Updated Successfully ✅');
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.log(err);
        alert('Update Failed ❌');
      }
    });
  }

  uploadLogo() {
    if (!this.selectedFile) return;

    this.profileService.uploadLogo(this.selectedFile, this.seller.id)
      .subscribe({
        next: () => {
          this.isLoading = false;
          alert('Profile & Logo Updated 🎉');
        },
        error: () => {
          this.isLoading = false;
          alert('Logo Upload Failed ❌');
        }
      });
  }

updatePassword() {

  if (!this.currentPassword || !this.newPassword || !this.ConfirmNewPassword) {
    alert('Please fill all fields ❌');
    return;
  }

  if (this.newPassword !== this.ConfirmNewPassword) {
    alert('Passwords do not match ❌');
    return;
  }

  const body = {
    currentPassword: this.currentPassword,
    newPassword: this.newPassword,
    confirmNewPassword: this.ConfirmNewPassword
  };

  this.profileService.changePassword(body).subscribe({
    next: () => {

      alert('Password changed successfully ✅');

      // 🔥 امسح التوكن (logout)
      localStorage.removeItem('token');

      // 🔥 روح للوجين
      window.location.href = '/login';
    },

    error: (err) => {
      console.log(err);
      alert(err.error?.message || 'Failed to change password ❌');
    }
  });
}

loadWallet() {
  this.walletLoading = true;
  this.walletError = '';
  this.profileService.getWallet().subscribe({
    next: (res: any) => {
      const data = res?.data ?? res ?? {};
      const txRows = Array.isArray(data?.recentTransactions ?? data?.RecentTransactions)
        ? (data.recentTransactions ?? data.RecentTransactions)
        : [];
      this.wallet = {
        balance: data?.balance ?? data?.Balance ?? 0,
        recentTransactions: txRows
      };
      this.walletLoading = false;
    },
    error: (err) => {
      this.walletLoading = false;
      this.walletError = err?.error?.message || 'Failed to load wallet.';
    }
  });
}
get walletPagedTransactions() {
  if (!this.wallet?.recentTransactions) return [];
  const start = (this.walletPage - 1) * this.walletPageSize;
  return this.wallet.recentTransactions.slice(start, start + this.walletPageSize);
}

get walletTotalPages(): number {
  if (!this.wallet?.recentTransactions) return 1;
  return Math.max(1, Math.ceil(this.wallet.recentTransactions.length / this.walletPageSize));
}

walletGoTo(page: number) {
  if (page >= 1 && page <= this.walletTotalPages) this.walletPage = page;
}

}
