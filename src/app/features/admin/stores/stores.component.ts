import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AllSellerForAdminService } from '../../../core/services/all-seller-for-admin.service';

@Component({
  selector: 'app-stores',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './stores.component.html',
  styleUrl: './stores.component.css'
})
export class StoresComponent {

  stores: any[] = [];
  isLoading = false;

  // pagination (server-side)
  pageSize = 5;
  currentPage = 1;
  totalCount = 0;

  activeFilter = 'All';
  searchTerm = '';

  constructor(private sellerService: AllSellerForAdminService) {}

  ngOnInit(): void {
    this.loadStores();
  }

loadStores() {
  this.isLoading = true;

  this.sellerService
    .getAllSellers(this.currentPage, this.pageSize, this.searchTerm)
    .subscribe({
      next: (res: any) => {

        // ✅ الصح
        this.stores = res.data.items;

        // pagination
        this.totalCount = res.data.records;

        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
}

  // 🔍 search
  applyFilters() {
    this.currentPage = 1;
    this.loadStores();
  }

  setFilter(filter: string) {
    this.activeFilter = filter;
    this.applyFilters();
  }

  // pagination
  get totalPages(): number[] {
    return Array.from(
      { length: Math.ceil(this.totalCount / this.pageSize) },
      (_, i) => i + 1
    );
  }

  goToPage(page: number) {
    this.currentPage = page;
    this.loadStores();
  }

  nextPage() {
    if (this.currentPage < this.totalPages.length) {
      this.currentPage++;
      this.loadStores();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadStores();
    }
  }
}
