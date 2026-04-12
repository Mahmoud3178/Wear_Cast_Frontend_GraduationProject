import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css'
})
export class OrdersComponent {

  orders = [
    {
      id: '#ORD-12345',
      customer: 'John Doe',
      store: 'Main Street Store',
      amount: 125.50,
      status: 'Processing',
      itemsCount: 2,
      items: [
        { name: 'T-Shirt', price: 34.99 },
        { name: 'Jeans', price: 90.51 }
      ],
      email: 'john@example.com',
      phone: '01000000000',
        shippingAddress: '456 Avenue, Alexandria, Egypt',
    paymentMethod: 'Visa ending in **** 4242'
    },
    {
      id: '#ORD-12346',
      customer: 'Jane Smith',
      store: 'Uptown Boutique',
      amount: 89.99,
      status: 'Completed',
      itemsCount: 2,
      items: [
        { name: 'Shirt', price: 34.99 },
        { name: 'Jeans', price: 55.00 }
      ],
      email: 'jane@example.com',
      phone: '01111111111',
        shippingAddress: '456 Avenue, Alexandria, Egypt',
    paymentMethod: 'Visa ending in **** 4242'
    }
  ];

  selectedOrder: any = null;

  openDetails(order: any) {
    this.selectedOrder = order;
  }
}
