import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AllSellerForAdminService } from '../../../core/services/all-seller-for-admin.service';

@Component({
  selector: 'app-store-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './store-details.component.html',
  styleUrl: './store-details.component.css'
})
export class StoreDetailsComponent implements OnInit {

  storeId!: number;
  store: any;
  wallet: any = null;
  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private sellerService: AllSellerForAdminService
  ) {}

  ngOnInit(): void {
    this.storeId = +this.route.snapshot.paramMap.get('id')!;
    this.loadStore();
  }

  loadStore() {
    this.isLoading = true;
    this.sellerService.getSellerProfile(this.storeId).subscribe({
      next: (res: any) => {
        this.store = res?.data || res;
        this.isLoading = false;
        this.loadWallet();
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  loadWallet() {
    this.sellerService.getSellerWallet(this.storeId).subscribe({
      next: (res: any) => { this.wallet = res?.data; },
      error: () => { this.wallet = null; }
    });
  }
}
