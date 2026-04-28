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

  storeId!: string;
  store: any;
  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private sellerService: AllSellerForAdminService
  ) {}

  ngOnInit(): void {
    this.storeId = this.route.snapshot.paramMap.get('id')!;

    // 🧠 لو جاية من navigation
    const nav = history.state;
    if (nav?.store) {
      this.store = nav.store;
    } else {
      this.loadStore();
    }
  }

  loadStore() {
    this.isLoading = true;

    this.sellerService.getSellerById(this.storeId).subscribe({
      next: (res: any) => {
        this.store = res.data || res;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  approveStore() {
    // هنا تربط API approve بعدين
    this.store.status = 'Approved';
  }

  banStore() {
    // هنا تربط API ban بعدين
    this.store.status = 'Banned';
  }
}
