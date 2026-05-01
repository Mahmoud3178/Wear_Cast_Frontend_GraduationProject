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
  activeImageUrl: string | null = null;
  activeImageContext: string[] = [];
  activeImageIndex = 0;
  inspectedDesigns: Record<number, { texts: string[], images: string[] }> = {};

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
    if ((this.itemsByOrderId[order.id]?.length ?? 0) > 0) return;
    this.loadingItemsForId = order.id;
    this.factoryApi.getFactoryOrderItems(order.id).subscribe({
      next: items => {
        this.itemsByOrderId[order.id] = items;
        this.loadingItemsForId = null;
        // Parse design data for each item
        items.forEach(item => {
          if (item.kind === 'designed' && item.raw) {
            const json = item.raw['viewDesignsJson'] || item.raw['ViewDesignsJson'];
            if (json && typeof json === 'string') {
              this.inspectedDesigns[item.customerDesignId || 0] = this.parseDesignJson(json);
            }
          }
        });
      },
      error: () => {
        this.itemsByOrderId[order.id] = [];
        this.loadingItemsForId = null;
      }
    });
  }

  private parseDesignJson(jsonStr: string): { texts: string[], images: string[] } {
    const texts: string[] = [];
    const images: string[] = [];
    try {
      const data = JSON.parse(jsonStr);
      // data is { front: { objects: [...] }, back: ... }
      Object.values(data).forEach((view: any) => {
        if (view && Array.isArray(view.objects)) {
          view.objects.forEach((obj: any) => {
            if (obj.type === 'i-text' || obj.type === 'text') {
              if (obj.text && obj.text.trim()) texts.push(obj.text.trim());
            } else if (obj.type === 'group' && obj.textSource) {
              if (obj.textSource.trim()) texts.push(obj.textSource.trim());
            } else if (obj.type === 'image') {
              if (obj.src) images.push(obj.src);
            }
          });
        }
      });
    } catch (e) {}
    return { 
      texts: [...new Set(texts)], 
      images: [...new Set(images.filter(img => !img.startsWith('data:')))] 
    };
  }

  openImageModal(url: string | null, context: string[] = []): void {
    this.activeImageUrl = url;
    this.activeImageContext = context.length > 0 ? context : (url ? [url] : []);
    this.activeImageIndex = url ? this.activeImageContext.indexOf(url) : 0;
    if (this.activeImageIndex === -1) this.activeImageIndex = 0;
  }

  nextImage(event: Event): void {
    event.stopPropagation();
    if (this.activeImageContext.length <= 1) return;
    this.activeImageIndex = (this.activeImageIndex + 1) % this.activeImageContext.length;
    this.activeImageUrl = this.activeImageContext[this.activeImageIndex];
  }

  prevImage(event: Event): void {
    event.stopPropagation();
    if (this.activeImageContext.length <= 1) return;
    this.activeImageIndex = (this.activeImageIndex - 1 + this.activeImageContext.length) % this.activeImageContext.length;
    this.activeImageUrl = this.activeImageContext[this.activeImageIndex];
  }

  closeImageModal(): void {
    this.activeImageUrl = null;
    this.activeImageContext = [];
    this.activeImageIndex = 0;
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here if available
      console.log('Copied to clipboard:', text);
    });
  }

  trackByOrderId(_: number, order: FactoryOrderSummary): number {
    return order.id;
  }
}
