import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AllSellerForAdminService } from '../../../core/services/all-seller-for-admin.service';

@Component({
  selector: 'app-store-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './store-details.component.html',
  styleUrl: './store-details.component.css'
})
export class StoreDetailsComponent {

  storeId!: number;
  store: any;
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
        // 👇 أهم سطر هنا
        this.store = res?.data || res;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }
}
