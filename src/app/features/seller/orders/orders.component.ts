import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './orders.component.html',
})
export class OrdersComponent implements OnInit {

  searchText = '';

  stats = [
    { title: 'Total Orders', value: 1248, icon: 'bi-cart', color: 'text-primary' },
    { title: 'Pending', value: 5, icon: 'bi-truck', color: 'text-warning' },
    { title: 'Returns', value: 2, icon: 'bi-arrow-counterclockwise', color: 'text-danger' },
    { title: 'Revenue', value: '$12.4k', icon: 'bi-currency-dollar', color: 'text-success' }
  ];

  orders = [
    {
      id: '7752',
      customer: 'Alice Smith',
      email: 'alice@example.com',
      items: [
        {
          name: 'Wool Sweater',
          image: 'data:image/webp;base64,UklGRkwT...',
          qty: 1,
          size: 'M',
          color: 'Black'
        }
      ],
      date: 'Oct 24, 2023',
      amount: 89,
      status: 'Shipped'
    },
    {
      id: '7753',
      customer: 'Bob Johnson',
      email: 'bob@example.com',
      items: [
        {
          name: 'Leather Jacket',
          image: 'data:image/webp;base64,...',
          qty: 2,
          size: 'L',
          color: 'Brown'
        }
      ],
      date: 'Oct 25, 2023',
      amount: 199,
      status: 'Pending'
    },
        {
      id: '7753',
      customer: 'Bob Johnson',
      email: 'bob@example.com',
      items: [
        {
          name: 'Leather Jacket',
          image: 'data:image/webp;base64,...',
          qty: 2,
          size: 'L',
          color: 'Brown'
        }
      ],
      date: 'Oct 25, 2023',
      amount: 199,
      status: 'Pending'
    },
        {
      id: '7753',
      customer: 'Bob Johnson',
      email: 'bob@example.com',
      items: [
        {
          name: 'Leather Jacket',
          image: 'data:image/webp;base64,...',
          qty: 2,
          size: 'L',
          color: 'Brown'
        }
      ],
      date: 'Oct 25, 2023',
      amount: 199,
      status: 'Pending'
    },
        {
      id: '7753',
      customer: 'Bob Johnson',
      email: 'bob@example.com',
      items: [
        {
          name: 'Leather Jacket',
          image: 'data:image/webp;base64,...',
          qty: 2,
          size: 'L',
          color: 'Brown'
        }
      ],
      date: 'Oct 25, 2023',
      amount: 199,
      status: 'Pending'
    },
        {
      id: '7753',
      customer: 'Bob Johnson',
      email: 'bob@example.com',
      items: [
        {
          name: 'Leather Jacket',
          image: 'data:image/webp;base64,...',
          qty: 2,
          size: 'L',
          color: 'Brown'
        }
      ],
      date: 'Oct 25, 2023',
      amount: 199,
      status: 'Pending'
    }
    // ممكن تضيف orders أكتر هنا
  ];

  pageSize = 5;
  currentPage = 1;

  ngOnInit() {
    // لو عندك product بدل items، حوّلها لـ array هنا
    // this.orders = this.orders.map(order => ({
    //   ...order,
    //   items: order.product ? [order.product] : []
    // }));
  }

  // 🔍 Search
  get filteredOrders() {
    const text = this.searchText.toLowerCase();

    return this.orders.filter(o =>
      o.id.includes(text) ||
      o.customer.toLowerCase().includes(text) ||
      o.items.some(item => item.name.toLowerCase().includes(text))
    );
  }

  // 📄 Pagination
  get totalPages(): number[] {
    return Array.from(
      { length: Math.ceil(this.filteredOrders.length / this.pageSize) },
      (_, i) => i + 1
    );
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.pageSize;
  }

  get endIndex(): number {
    return Math.min(this.startIndex + this.pageSize, this.filteredOrders.length);
  }

  get pagedOrders() {
    return this.filteredOrders.slice(this.startIndex, this.endIndex);
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
