import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface OrderItem {

  productName: string;
  productImage: string;
  sku: string;
  price: number;
  qty: number;
  total: number;

}

@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-details.component.html',
  styleUrl: './order-details.component.css'
})

export class OrderDetailsComponent {

  order = {

    id: 'ORD-7829',

    status: 'Order Placed',

    placedAt: 'Oct 24, 2023 at 10:43 AM',

    steps: [

      'Order Placed',
      'Confirmed',
      'Processing',
      'Shipped',
      'Delivered'

    ],

    currentStep: 0

  };

  customer = {

    name: 'Sarah Jenkins',

    avatar: 'https://i.pravatar.cc/80?img=5',

    email: 'sarah.j@example.com',

    phone: '+1 (555) 123-4567',

    orders: 12,

    spent: '$3.2k'

  };

  shippingAddress = `123 Market St,
San Francisco, CA 94103,
United States`;

  billingAddress = `456 Oak Ave,
San Francisco, CA 94102,
United States`;

  note = 'Customer requested expedited shipping if possible.';

  items: OrderItem[] = [];

  subtotal = 260;

  discount = 26;

  shipping = 15;

  tax = 20.8;

  total = 269.8;

  ngOnInit(): void {

    this.items = [

      {
        productName: 'Nike Air Zoom Pegasus',
        productImage: 'https://via.placeholder.com/48',
        sku: 'NK-ZOOM-001',
        price: 120,
        qty: 1,
        total: 120
      },

      {
        productName: 'Adidas Ultraboost',
        productImage: 'https://via.placeholder.com/48',
        sku: 'AD-ULTRA-002',
        price: 140,
        qty: 1,
        total: 140
      }

    ];

  }

  confirmOrder() {

    this.order.status = 'Confirmed';

    this.order.currentStep = 1;

  }

}
