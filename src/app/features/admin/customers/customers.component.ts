import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.css'
})
export class CustomersComponent {

  constructor(private router: Router) {}

  searchTerm = '';
  selectedFilter = 'all';

  customers = [
    {
      id: 1,
      name: 'Olivia Rhye',
      email: 'olivia@email.com',
      phone: '(555) 123-4567',
      status: 'Active',
      image: 'https://i.pravatar.cc/40?img=1'
    },
    {
      id: 2,
      name: 'Phoenix Baker',
      email: 'phoenix@email.com',
      phone: '(555) 987-6543',
      status: 'Active',
      image: 'https://i.pravatar.cc/40?img=2'
    },
    {
      id: 3,
      name: 'Lana Steiner',
      email: 'lana@email.com',
      phone: '(555) 234-5678',
      status: 'Suspended',
      image: 'https://i.pravatar.cc/40?img=3'
    },
    {
      id: 4,
      name: 'Demi Wilkinson',
      email: 'demi@email.com',
      phone: '(555) 876-5432',
      status: 'Active',
      image: 'https://i.pravatar.cc/40?img=4'
    }
  ];

  goToDetails(id: number) {
    this.router.navigate(['/admin/customers', id]);
  }

  setFilter(filter: string) {
    this.selectedFilter = filter;
  }

  filteredCustomers() {
    return this.customers.filter(c => {

      // filter by status
      if (this.selectedFilter === 'active' && c.status !== 'Active') return false;
      if (this.selectedFilter === 'suspended' && c.status !== 'Suspended') return false;

      // search
      if (this.searchTerm) {
        return c.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
               c.email.toLowerCase().includes(this.searchTerm.toLowerCase());
      }

      return true;
    });
  }
}
