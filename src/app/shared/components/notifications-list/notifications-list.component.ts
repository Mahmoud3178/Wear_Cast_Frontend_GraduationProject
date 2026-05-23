import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  NotificationItem,
  NOTIFICATION_SORT_NEWEST,
  NOTIFICATION_SORT_OLDEST,
  NotificationsService
} from '../../../core/services/notifications.service';
import { FactoryApiService, FactoryOrderItem } from '../../../core/services/factory-api.service';

type ReadFilter = 'all' | 'unread' | 'read';

@Component({
  selector: 'app-notifications-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notifications-list.component.html',
  styleUrl: './notifications-list.component.css'
})
export class NotificationsListComponent implements OnInit {
  @Input() pageSubtitle = 'Stay updated on your account activity';
  @Input() portalRole: 'factory' | 'seller' | 'customer' | 'admin' = 'factory';

  notifications: NotificationItem[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  toastMsg = '';
  toastVisible = false;

  selectedType: number | undefined = undefined;
  readFilter: ReadFilter = 'all';
  sortBy = NOTIFICATION_SORT_NEWEST;

  pageIndex = 1;
  pageSize = 20;
  totalPages = 1;
  totalCount = 0;

  readonly sortOptions = [
    { label: 'Newest', value: NOTIFICATION_SORT_NEWEST },
    { label: 'Oldest', value: NOTIFICATION_SORT_OLDEST }
  ];

  showOrderItemsModal = false;
  loadingOrderItems = false;
  selectedOrderItems: FactoryOrderItem[] | null = null;
  selectedOrderId: number | null = null;
  inspectedDesigns: Record<number, any> = {};

  activeImageUrl: string | null = null;
  activeImageContext: string[] = [];
  activeImageIndex = 0;

  private readonly notifService = inject(NotificationsService);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly router = inject(Router);
  private readonly factoryApi = inject(FactoryApiService);

 ngOnInit(): void {
  const routeSubtitle = this.route?.snapshot.data['subtitle'];
  if (typeof routeSubtitle === 'string' && routeSubtitle.trim()) {
    this.pageSubtitle = routeSubtitle.trim();
  }

  const routeRole = this.route?.snapshot.data['portalRole'];
  if (routeRole) {
    this.portalRole = routeRole;
  } else {
    // fallback: اكتشف من الـ URL
    const url = this.router.url;
    if (url.includes('/factory/'))       this.portalRole = 'factory';
    else if (url.includes('/seller/'))   this.portalRole = 'seller';
    else if (url.includes('/admin/'))    this.portalRole = 'admin';
    else if (url.includes('/customer/')) this.portalRole = 'customer';
  }

  this.notifService.receiveAll().subscribe({
    next: () => {
      window.dispatchEvent(new CustomEvent('notif-delivered'));
      this.load();
    },
    error: () => this.load()
  });
}

  get unread(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  load(): void {
    this.isLoading = true;
    this.errorMessage = null;

    const isRead =
      this.readFilter === 'unread' ? false : this.readFilter === 'read' ? true : null;

    this.notifService
      .getAllQuery({
        pageIndex: this.pageIndex,
        pageSize: this.pageSize,
        sortBy: this.sortBy,
        isRead,
        notificationType: this.selectedType
      })
      .subscribe({
        next: (res: unknown) => {
          const parsed = this.notifService.parseListResponse(res);
          this.notifications = parsed.items;
          this.totalCount = parsed.totalCount;
          this.totalPages = parsed.totalPages;
          this.pageIndex = parsed.pageIndex;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage = 'Could not load notifications. Please try again.';
        }
      });
  }

  showToast(msg: string) {
    this.toastMsg = msg;
    this.toastVisible = true;
    setTimeout(() => this.toastVisible = false, 3000);
  }

markRead(n: NotificationItem): void {
  if (!n.isRead) {
    this.notifService.markAsRead(n.id).subscribe({
      next: () => {
        n.isRead = true;
        window.dispatchEvent(new CustomEvent('notif-read')); // ← أضف
      }
    });
  }
  this.navigate(n);
}

  navigate(n: NotificationItem): void {
    const type = n.notificationType as any;
    const urlId = (n as any).urlId;

    if (this.portalRole === 'factory') {
      if (urlId) {
        const orderId = parseInt(urlId, 10);
        if (!isNaN(orderId)) {
          this.selectedOrderId = orderId;
          this.showOrderItemsModal = true;
          this.loadingOrderItems = true;
          this.selectedOrderItems = null;
          this.factoryApi.getFactoryOrderItems(orderId).subscribe({
            next: items => {
              this.selectedOrderItems = items;
              this.loadingOrderItems = false;
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
              this.selectedOrderItems = [];
              this.loadingOrderItems = false;
            }
          });
        } else {
          this.router.navigate(['/factory/orders']);
        }
      } else {
        this.router.navigate(['/factory/orders']);
      }
      return;
    }

    if (this.portalRole === 'seller') {
      if (!urlId) return;
      switch (type) {
        case 'NewOrder':
        case 5:
          this.router.navigate(['/seller/orders', urlId]); break;
        default: break;
      }
      return;
    }

    if (this.portalRole === 'admin') {
      switch (type) {
        case 'ShipmentUpdateStatus':
        case 'NewShipment':
        case 'ShipmentUnAssigned':
        case 'ShipmentAssigned':
        case 'ShipmentReady':
          if (urlId) this.router.navigate(['/admin/shipments', urlId]); break;
        case 'NewSellerApplication':
          if (urlId) this.router.navigate(['/admin/seller-applications'], { queryParams: { openId: urlId } }); break;
        case 'NewOrder':
          if (urlId) this.router.navigate(['/admin/orders', urlId]); break;
        case 'NewProduct':
          if (urlId) this.router.navigate(['/admin/products', urlId]); break;
        default: break;
      }
      return;
    }
  }

  private parseDesignJson(jsonStr: string): { texts: string[], images: string[] } {
    const texts: string[] = [];
    const images: string[] = [];
    try {
      const data = JSON.parse(jsonStr);
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
      console.log('Copied to clipboard:', text);
    });
  }

  closeOrderItemsModal(): void {
    this.showOrderItemsModal = false;
    this.selectedOrderItems = null;
    this.selectedOrderId = null;
  }



markAllRead(): void {
  this.notifService.markAllAsRead().subscribe({
    next: () => {
      this.notifications.forEach(n => { n.isRead = true; });
      window.dispatchEvent(new CustomEvent('notif-all-read')); // ← أضف
    }
  });
}

  delete(n: NotificationItem, event: Event): void {
    event.stopPropagation();
    this.notifService.delete(n.id).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(x => x.id !== n.id);
        this.totalCount = Math.max(0, this.totalCount - 1);
        this.showToast('Notification deleted successfully');
      },
      error: () => this.showToast('Failed to delete notification')
    });
  }

  applyFilters(readFilter: ReadFilter, type?: number): void {
    this.readFilter = readFilter;
    this.selectedType = type;
    this.pageIndex = 1;
    this.load();
  }

  filterByType(type: number | undefined): void {
    const newType = this.selectedType === type ? undefined : type;
    this.applyFilters(this.readFilter, newType);
  }

  setReadFilter(filter: ReadFilter): void {
    this.applyFilters(filter, this.selectedType);
  }

  onSortChange(): void {
    this.pageIndex = 1;
    this.load();
  }

  changePage(delta: number): void {
    const next = this.pageIndex + delta;
    if (next < 1 || next > this.totalPages) return;
    this.pageIndex = next;
    this.load();
  }

  notificationDate(n: NotificationItem): string | null {
    const raw = n.createdOn || n.createdAt;
    return raw && raw.trim() ? raw : null;
  }

  typeLabel(type: any): string {
    const map: Record<string, string> = {
      'ShipmentUpdateStatus': 'Shipment Update',
      'NewSellerApplication': 'Seller Application',
      'NewOrder': 'New Order',
      'NewShipment': 'New Shipment',
      'NewProduct': 'New Product',
      'ShipmentUnAssigned': 'Shipment Unassigned',
      'ShipmentAssigned': 'Shipment Assigned',
      'ShipmentReady': 'Shipment Ready',
      'DriverDeActivated': 'Driver Deactivated',
      'DriverDeleted': 'Driver Deleted',
    };
    return map[type] ?? 'Notification';
  }

  typeIcon(type: any): string {
    const map: Record<string, string> = {
      'ShipmentUpdateStatus': 'bi-truck',
      'NewSellerApplication': 'bi-shop',
      'NewOrder': 'bi-bag-check',
      'NewShipment': 'bi-box-seam',
      'NewProduct': 'bi-tag',
      'ShipmentUnAssigned': 'bi-truck',
      'ShipmentAssigned': 'bi-truck',
      'ShipmentReady': 'bi-check-circle',
      'DriverDeActivated': 'bi-person-x',
      'DriverDeleted': 'bi-person-dash',
    };
    return map[type] ?? 'bi-bell';
  }

  typeColor(type: any): string {
    const map: Record<string, string> = {
      'ShipmentUpdateStatus': 'notif-icon--indigo',
      'NewSellerApplication': 'notif-icon--yellow',
      'NewOrder': 'notif-icon--green',
      'NewShipment': 'notif-icon--cyan',
      'NewProduct': 'notif-icon--purple',
      'ShipmentUnAssigned': 'notif-icon--yellow',
      'ShipmentAssigned': 'notif-icon--green',
      'ShipmentReady': 'notif-icon--green',
      'DriverDeActivated': 'notif-icon--red',
      'DriverDeleted': 'notif-icon--red',
    };
    return map[type] ?? 'notif-icon--muted';
  }
}
