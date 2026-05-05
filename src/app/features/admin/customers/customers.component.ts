import { ToastService } from '../../../core/services/toast.service';
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
    private customerService: AllCustomersForAdminService,
    private toast: ToastService  // ← أضف السطر ده

  ) {}

  searchTerm = '';
  selectedFilter = 'all';

  customers: any[] = [];
  isLoading = false;
showDeleteBox = false;
deleteReason = '';
selectedCustomerId!: number;
  currentPage = 1;
  pageSize = 5;
  totalCount = 0;

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers() {
    this.isLoading = true;

    this.customerService.getAllCustomers(
      this.currentPage,
      this.pageSize,
      this.searchTerm
    ).subscribe({
      next: (res: any) => {

        this.customers = res.data.items.map((c: any) => ({
          id: c.id,
          name: `${c.firstName ?? ''} ${c.lastName ?? ''}`,
          email: c.email,
          phoneNumber: c.phoneNumber,

          // ✅ FIX IMAGE (both cases)
          image: c.imageUrl || c.imageurl || 'https://i.pravatar.cc/40',

          city: c.city ?? '',
          status: 'Active'
        }));

        this.totalCount = res.data.records;
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }
openDelete(id: number) {
  this.selectedCustomerId = id;
  this.deleteReason = '';
  this.showDeleteBox = true;
}
cancelDelete() {
  this.showDeleteBox = false;
  this.deleteReason = '';
}
confirmDelete() {

  if (!this.deleteReason || this.deleteReason.trim() === '') {
    this.toast.warning('Please enter a delete reason');
    return;
  }

  const body = {
    reason: this.deleteReason
  };

  this.customerService.deleteCustomer(this.selectedCustomerId, body)
    .subscribe({
      next: () => {
        this.showDeleteBox = false;
        this.loadCustomers();
      },
      error: (err) => this.toast.error(err.error?.title || 'Delete failed')
    });
}
  onSearch() {
    this.currentPage = 1;
    this.loadCustomers();
  }

  goToDetails(id: number) {
    this.router.navigate(['/admin/customers', id]);
  }

  setFilter(filter: string) {
    this.selectedFilter = filter;
  }

  get filteredCustomers() {
    return this.customers.filter(c => {
      if (this.selectedFilter === 'active' && c.status !== 'Active') return false;
      if (this.selectedFilter === 'suspended' && c.status !== 'Suspended') return false;
      return true;
    });
  }

  goToPage(page: number) {
    this.currentPage = page;
    this.loadCustomers();
  }

  get totalPages(): number[] {
    return Array.from(
      { length: Math.ceil(this.totalCount / this.pageSize) },
      (_, i) => i + 1
    );
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

deleteCustomer(id: number) {

  const reason = prompt('Enter delete reason:');

  if (!reason || reason.trim() === '') return;

  const body = {
    reason: reason
  };

  this.customerService.deleteCustomer(id, body).subscribe({
    next: () => this.loadCustomers()
  });
}
}
