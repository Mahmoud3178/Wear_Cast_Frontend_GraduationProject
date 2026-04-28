import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AllCustomersForAdminService } from '../../../core/services/all-customers-for-admin.service';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.css'
})
export class CustomersComponent {

  constructor(
    private router: Router,
    private customerService: AllCustomersForAdminService
  ) {}

  searchTerm = '';
  selectedFilter = 'all';

  customers: any[] = [];
  isLoading = false;

  // pagination
  currentPage = 1;
  pageSize = 5;
  totalCount = 0;

  ngOnInit(): void {
    this.loadCustomers();
  }

 loadCustomers() {
  this.isLoading = true;

  this.customerService
    .getAllCustomers(this.currentPage, this.pageSize, this.searchTerm)
    .subscribe({
      next: (res: any) => {

        this.customers = res.data.items.map((c: any) => ({
          id: c.id,

          // ✅ دمج الاسم
          name: `${c.firstName} ${c.lastName}`,

          email: c.email,
          phoneNumber: c.phoneNumber,

          // ✅ الصورة
          image: c.imageUrl || 'https://i.pravatar.cc/40',

          city: c.city,

          // مؤقت لحد ما الباك يدعمها
          status: 'Active'
        }));

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
  onSearch() {
    this.currentPage = 1;
    this.loadCustomers();
  }

  setFilter(filter: string) {
    this.selectedFilter = filter;
  }

  goToDetails(id: number) {
    this.router.navigate(['/admin/customers', id]);
  }

  // ⚠️ فلترة بسيطة (لو مفيش status من API)
  get filteredCustomers() {
    return this.customers.filter(c => {

      if (this.selectedFilter === 'active' && c.status !== 'Active') return false;
      if (this.selectedFilter === 'suspended' && c.status !== 'Suspended') return false;

      return true;
    });
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
    this.loadCustomers();
  }

  nextPage() {
    if (this.currentPage < this.totalPages.length) {
      this.currentPage++;
      this.loadCustomers();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadCustomers();
    }
  }
}
