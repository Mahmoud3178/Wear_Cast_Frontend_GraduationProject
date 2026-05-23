import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationsService } from '../../../core/services/notifications.service';
import { NotificationsPollingService } from '../../../core/services/notifications-polling.service';

@Component({
  selector: 'app-notifications-shipping',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications-shipping.component.html',
  styleUrl: './notifications-shipping.component.css'
})
export class NotificationsShippingComponent implements OnInit {

  notifications: any[] = [];
  isLoading = false;
  isReadFilter: boolean | undefined = undefined;
  toastMsg = '';
  toastVisible = false;

  constructor(
    private notifService: NotificationsService,
    private notifPolling: NotificationsPollingService,
    private router: Router
  ) {}

ngOnInit() {
  this.notifService.receiveAll().subscribe(() => {
    this.notifPolling.reload();
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
    this.notifService.markAsRead(n.id).subscribe(() => {
      n.isRead = true;
      this.notifPolling.reload();
    });
  }
  this.navigate(n);
}

 navigate(n: any) {
  const type = n.notificationType;
  const urlId = n.urlId;

  switch (type) {
    case 'NewOrder':
      if (urlId) this.router.navigate(['/factory/orders', urlId]);
      break;
    case 'ShipmentUnAssigned':
    case 'ShipmentAssigned':
    case 'ShipmentReady':
      if (urlId) this.router.navigate(['/shipping/shipments', urlId]);
      break;
    case 'DriverDeActivated':
    case 'DriverDeleted':
      this.router.navigate(['/shipping/shipments']);
      break;
    default: break;
  }
}



markAllRead() {
  this.notifService.markAllAsRead().subscribe(() => {
    this.notifications.forEach(n => n.isRead = true);
    this.notifPolling.reload();
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
      'ShipmentUnAssigned': 'Shipment Unassigned',
      'ShipmentAssigned':   'Shipment Assigned',
      'ShipmentReady':      'Shipment Ready',
      'DriverDeActivated':  'Driver Deactivated',
      'DriverDeleted':      'Driver Deleted',
    };
    return map[type] ?? 'Notification';
  }

  typeIcon(type: string): string {
    const map: Record<string, string> = {
      'ShipmentUnAssigned': 'bi-truck',
      'ShipmentAssigned':   'bi-truck',
      'ShipmentReady':      'bi-check-circle',
      'DriverDeActivated':  'bi-person-x',
      'DriverDeleted':      'bi-person-dash',
    };
    return map[type] ?? 'bi-bell';
  }

  typeColor(type: string): string {
    const map: Record<string, string> = {
      'ShipmentUnAssigned': 'icon-yellow',
      'ShipmentAssigned':   'icon-green',
      'ShipmentReady':      'icon-green',
      'DriverDeActivated':  'icon-red',
      'DriverDeleted':      'icon-red',
    };
    return map[type] ?? 'icon-gray';
  }
}
