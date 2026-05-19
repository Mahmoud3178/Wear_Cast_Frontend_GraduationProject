import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationsService } from '../../../core/services/notifications.service';

@Component({
  selector: 'app-notifications-drivers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications-drivers.component.html',
  styleUrl: './notifications-drivers.component.css'
})
export class NotificationsDriversComponent implements OnInit {

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
    this.notifService.getAll(1, 50, undefined, this.isReadFilter).subscribe({
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
    const type = n.notificationType;
    const urlId = n.urlId;
    switch (type) {
      case 'ShipmentAssigned':
        if (urlId) this.router.navigate(['/driver/shipments', urlId]);
        break;
      default: break;
    }
  }

  markAllRead() {
    this.notifService.markAllAsRead().subscribe(() => {
      this.notifications.forEach(n => n.isRead = true);
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
      'ShipmentAssigned': 'Shipment Assigned',
    };
    return map[type] ?? 'Notification';
  }

  typeIcon(type: string): string {
    const map: Record<string, string> = {
      'ShipmentAssigned': 'bi-truck',
    };
    return map[type] ?? 'bi-bell';
  }

  typeColor(type: string): string {
    const map: Record<string, string> = {
      'ShipmentAssigned': 'icon-green',
    };
    return map[type] ?? 'icon-gray';
  }
}
