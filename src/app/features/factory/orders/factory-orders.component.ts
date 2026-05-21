import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FactoryApiService,
  FactoryOrderItem,
  FactoryOrderSummary,
  FactoryOrdersPage
} from '../../../core/services/factory-api.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-factory-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './factory-orders.component.html'
})
export class FactoryOrdersComponent implements OnInit {
  orders: FactoryOrderSummary[] = [];
  ordersPageMeta: Omit<FactoryOrdersPage, 'orders'> | null = null;
  pageNumber = 1;
  readonly pageSize = 10;
  expandedOrderId: number | null = null;
  itemsByOrderId: Record<number, FactoryOrderItem[]> = {};
  loadingOrders = false;
  loadingItemsForId: number | null = null;
  loadError = '';
  activeImageUrl: string | null = null;
  activeImageContext: string[] = [];
  activeImageIndex = 0;
  inspectedDesigns: Record<number, { texts: string[], images: string[] }> = {};
  updatingStatusForId: number | null = null;
  statusUpdateError: string | null = null;
  statusUpdateSuccess: string | null = null;
  private openIdFromParam: number | null = null;

  constructor(
    private readonly factoryApi: FactoryApiService,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const openId = params['openId'];
      if (openId) {
        this.openIdFromParam = parseInt(openId, 10);
        this.handleOpenIdParam();
      }
    });
    this.loadOrders();
  }

  private handleOpenIdParam(): void {
    if (!this.openIdFromParam) return;
    if (this.orders && this.orders.length > 0) {
      const match = this.orders.find(o => o.id === this.openIdFromParam);
      if (match) {
        this.toggleItems(match);
        this.openIdFromParam = null; // Clear so it only opens once
      } else {
        // If not found in the current view of orders, reload the first page to check if it's there
        if (this.pageNumber !== 1) {
          this.pageNumber = 1;
          this.loadOrders();
        } else {
          this.loadOrders();
        }
      }
    }
  }

  loadOrders(): void {
    this.loadingOrders = true;
    this.loadError = '';
    this.expandedOrderId = null;
    this.factoryApi.getFactoryOrdersPage(this.pageNumber, this.pageSize).subscribe({
      next: page => {
        this.orders = page.orders;
        this.ordersPageMeta = {
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          totalRecords: page.totalRecords,
          totalPages: page.totalPages
        };
        this.pageNumber = page.pageNumber;
        this.loadingOrders = false;
        
        if (this.openIdFromParam) {
          const match = this.orders.find(o => o.id === this.openIdFromParam);
          if (match) {
            this.toggleItems(match);
          }
          this.openIdFromParam = null; // Always clear it to avoid loops
        }
      },
      error: err => {
        this.loadError = err?.message || 'Failed to load orders.';
        this.loadingOrders = false;
      }
    });
  }

  get canPrevOrdersPage(): boolean {
    return !this.loadingOrders && this.pageNumber > 1;
  }

  get canNextOrdersPage(): boolean {
    if (this.loadingOrders) return false;
    const meta = this.ordersPageMeta;
    const ps = meta?.pageSize ?? this.pageSize;
    const tp = meta?.totalPages ?? 0;
    if (tp > 0) {
      return this.pageNumber < tp;
    }
    return this.orders.length >= ps;
  }

  goPrevOrders(): void {
    if (!this.canPrevOrdersPage) return;
    this.pageNumber -= 1;
    this.loadOrders();
  }

  goNextOrders(): void {
    if (!this.canNextOrdersPage) return;
    this.pageNumber += 1;
    this.loadOrders();
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

  canSetStatusToReady(order: FactoryOrderSummary): boolean {
    // Only show the "set to ready" button when the status is Paid
    return (order.status?.toLowerCase() || '') === 'paid';
  }

  parseSizeDetails(sizeStr: string, totalQty: number): { size: string; quantity: number }[] {
    if (!sizeStr || sizeStr.trim() === '-' || sizeStr.trim() === '') return [];
    
    if (sizeStr.includes(',')) {
      return sizeStr.split(',').map(part => {
        const trimmed = part.trim();
        const match = trimmed.match(/^(.+?)\s*x\s*(\d+)$/i);
        if (match) {
          return {
            size: match[1].replace(/^_/, '').trim(),
            quantity: parseInt(match[2], 10)
          };
        } else {
          return {
            size: trimmed.replace(/^_/, '').trim(),
            quantity: 1
          };
        }
      });
    }

    const trimmed = sizeStr.trim();
    const match = trimmed.match(/^(.+?)\s*x\s*(\d+)$/i);
    if (match) {
      return [{
        size: match[1].replace(/^_/, '').trim(),
        quantity: parseInt(match[2], 10)
      }];
    } else {
      return [{
        size: trimmed.replace(/^_/, '').trim(),
        quantity: totalQty || 1
      }];
    }
  }

  setOrderToReady(order: FactoryOrderSummary): void {
    if (!this.canSetStatusToReady(order)) return;

    this.updatingStatusForId = order.id;
    this.statusUpdateError = null;
    this.statusUpdateSuccess = null;

    this.factoryApi.updateOrderStatus(order.id, 'Ready').subscribe({
      next: () => {
        this.updatingStatusForId = null;
        this.statusUpdateSuccess = `Order #${order.id} marked as Ready!`;
        // Update local order status
        order.status = 'Ready';
        setTimeout(() => this.statusUpdateSuccess = null, 3000);
      },
      error: (err: any) => {
        this.updatingStatusForId = null;
        this.statusUpdateError = err?.message || `Failed to update order #${order.id} status.`;
        setTimeout(() => this.statusUpdateError = null, 5000);
      }
    });
  }
}
