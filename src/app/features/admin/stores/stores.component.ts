import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, NgModel } from '@angular/forms';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-stores',
  standalone: true,
  imports: [CommonModule,FormsModule,RouterLink],
  templateUrl: './stores.component.html',
  styleUrl: './stores.component.css'
})
export class StoresComponent {

  stores: any[] = [];
  filteredStores: any[] = [];

  isLoading = false;

  // pagination
  pageSize = 5;
  currentPage = 1;

  activeFilter = 'All';
  searchTerm = '';

  ngOnInit(): void {
    this.loadStores();
  }

  loadStores() {
    // داتا مؤقتة (لحد ما تربطي API)
this.stores = [
  { id: 1, name: 'The Green Leaf', email: 'leaf@mail.com', status: 'Approved' },
  { id: 2, name: 'Modern Threads', email: 'threads@mail.com', status: 'Pending' },
  { id: 3, name: 'Gadget Hub', email: 'gadget@mail.com', status: 'Banned' },
  { id: 4, name: 'Book Corner', email: 'book@mail.com', status: 'Approved' },
  { id: 5, name: 'Home Essentials', email: 'home@mail.com', status: 'Banned' }
];

    this.applyFilters();
  }

  applyFilters() {
    this.filteredStores = this.stores.filter(store => {
      const matchesSearch =
        store.name.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesStatus =
        this.activeFilter === 'All' || store.status === this.activeFilter;

      return matchesSearch && matchesStatus;
    });

    this.currentPage = 1;
  }

  setFilter(filter: string) {
    this.activeFilter = filter;
    this.applyFilters();
  }

  // pagination
  get totalPages(): number[] {
    return Array.from(
      { length: Math.ceil(this.filteredStores.length / this.pageSize) },
      (_, i) => i + 1
    );
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.pageSize;
  }

  get endIndex(): number {
    return Math.min(this.startIndex + this.pageSize, this.filteredStores.length);
  }

  get pagedStores() {
    return this.filteredStores.slice(this.startIndex, this.endIndex);
  }

  goToPage(page: number) {
    this.currentPage = page;
  }

  nextPage() {
    if (this.currentPage < this.totalPages.length) {
      this.currentPage++;
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }
}
