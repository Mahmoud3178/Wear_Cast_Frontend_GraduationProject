import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FactoryApiService,
  FactoryOrderItem,
  FactoryOrderSummary
} from '../../../core/services/factory-api.service';

@Component({
  selector: 'app-factory-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './factory-orders.component.html'
})
export class FactoryOrdersComponent implements OnInit {
  orders: FactoryOrderSummary[] = [];
  expandedOrderId: number | null = null;
  itemsByOrderId: Record<number, FactoryOrderItem[]> = {};
  loadingOrders = false;
  loadingItemsForId: number | null = null;
  loadError = '';

  constructor(private readonly factoryApi: FactoryApiService) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loadingOrders = true;
    this.loadError = '';
    this.expandedOrderId = null;
    this.factoryApi.getFactoryOrders().subscribe({
      next: rows => {
        this.orders = rows;
        this.loadingOrders = false;
      },
      error: err => {
        this.loadError = err?.message || 'Failed to load orders.';
        this.loadingOrders = false;
      }
    });
  }

  toggleItems(order: FactoryOrderSummary): void {
    if (this.expandedOrderId === order.id) {
      this.expandedOrderId = null;
      return;
    }
    this.expandedOrderId = order.id;
    if (this.itemsByOrderId[order.id]) return;
    this.loadingItemsForId = order.id;
    this.factoryApi.getFactoryOrderItems(order.id).subscribe({
      next: items => {
        this.itemsByOrderId[order.id] = items;
        this.loadingItemsForId = null;
      },
      error: () => {
        this.itemsByOrderId[order.id] = [];
        this.loadingItemsForId = null;
      }
    });
  }

  trackByOrderId(_: number, order: FactoryOrderSummary): number {
    return order.id;
  }
}
