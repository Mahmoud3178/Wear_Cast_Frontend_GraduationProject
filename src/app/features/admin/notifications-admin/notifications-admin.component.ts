import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationsService } from '../../../core/services/notifications.service';

@Component({
  selector: 'app-notifications-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications-admin.component.html',
  styleUrl: './notifications-admin.component.css'
})
export class NotificationsAdminComponent implements OnInit {

  notifications: any[] = [];
  isLoading = false;
  isReadFilter: boolean | undefined = undefined;
    toastMsg = '';
  toastVisible = false;

  constructor(
    private notifService: NotificationsService,
    private router: Router
  ) {}

  ngOnInit() {
    this.notifService.receiveAll().subscribe(() => {
      window.dispatchEvent(new CustomEvent('notif-delivered'));
    });
    this.load();
  }

  load() {
  this.isLoading = true;
  this.notifService.getAll(1, 50, undefined, { isRead: this.isReadFilter }).subscribe({
    next: (res: any) => {
      this.notifications = res?.items ?? res?.data ?? res ?? [];
      this.isLoading = false;
    },
    error: () => { this.isLoading = false; }
  });
}

  get unread() { return this.notifications.filter(n => !n.isRead).length; }

  showToast(msg: string) {
    this.toastMsg = msg;
    this.toastVisible = true;
    setTimeout(() => this.toastVisible = false, 3000);
  }
  markRead(n: any) {
    if (!n.isRead) {
      this.notifService.markAsRead(n.id).subscribe(() => n.isRead = true);
    }
    this.navigate(n);
  }

navigate(n: any) {
  if (!n.urlId) return;
  const type = n.notificationType;

  switch (type) {
    case 'ShipmentUpdateStatus':
    case 'NewShipment':
    case 'ShipmentUnAssigned':   // ← UnAssigned بـ A كبيرة
    case 'ShipmentAssigned':
    case 'ShipmentReady':
      this.router.navigate(['/admin/shipments', n.urlId]); break;
case 'NewSellerApplication':
  this.router.navigate(['/admin/seller-applications'], {
    queryParams: { openId: n.urlId }  // ← query param بدل /:id
  }); break;
    case 'NewOrder':
      this.router.navigate(['/admin/orders', n.urlId]); break;
    case 'NewProduct':
      this.router.navigate(['/admin/products', n.urlId]); break;
    case 'DriverDeActivated':  // ← DeActivated بـ A كبيرة
    case 'DriverDeleted':
      this.router.navigate(['/admin/shipments']); break;
    default: break;
  }
}


markAllRead() {
  this.notifService.markAllAsRead().subscribe(() => {
    this.notifications.forEach(n => n.isRead = true);
    window.dispatchEvent(new CustomEvent('notif-delivered')); // ← أضف السطر ده
  });
}

  delete(n: any) {
    this.notifService.delete(n.id).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(x => x.id !== n.id);
        this.showToast('Notification deleted successfully');
      },
      error: () => this.showToast('Failed to delete notification')
    });
  }

  filterByRead(isRead: boolean | undefined) {
    this.isReadFilter = isRead;
    this.load();
  }

typeLabel(type: string): string {
  const map: Record<string, string> = {
    'ShipmentUpdateStatus': 'Shipment Update',
    'DriverDeActivated': 'Driver Deactivated',
    'DriverDeleted': 'Driver Deleted',
    'NewSellerApplication': 'Seller Application',
    'NewOrder': 'New Order',
    'NewShipment': 'New Shipment',
    'NewProduct': 'New Product',
    'ShipmentUnAssigned': 'Shipment Unassigned',
    'ShipmentAssigned': 'Shipment Assigned',
    'ShipmentReady': 'Shipment Ready',
  };
  return map[type] ?? 'Notification';
}

typeIcon(type: string): string {
  const map: Record<string, string> = {
    'ShipmentUpdateStatus': 'bi-truck',
    'DriverDeActivated': 'bi-person-x',
    'DriverDeleted': 'bi-person-dash',
    'NewSellerApplication': 'bi-shop',
    'NewOrder': 'bi-bag-check',
    'NewShipment': 'bi-box-seam',
    'NewProduct': 'bi-tag',
    'ShipmentUnAssigned': 'bi-truck',
    'ShipmentAssigned': 'bi-truck',
    'ShipmentReady': 'bi-check-circle',
  };
  return map[type] ?? 'bi-bell';
}

typeColor(type: string): string {
  const map: Record<string, string> = {
    'ShipmentUpdateStatus': 'icon-indigo',
    'DriverDeActivated': 'icon-red',
    'DriverDeleted': 'icon-red',
    'NewSellerApplication': 'icon-yellow',
    'NewOrder': 'icon-green',
    'NewShipment': 'icon-cyan',
    'NewProduct': 'icon-purple',
    'ShipmentUnAssigned': 'icon-yellow',
    'ShipmentAssigned': 'icon-green',
    'ShipmentReady': 'icon-green',
  };
  return map[type] ?? 'icon-gray';
}
}
