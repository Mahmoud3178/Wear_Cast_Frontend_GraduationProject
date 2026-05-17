import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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
  selectedType: number | undefined = undefined;

  constructor(private notifService: NotificationsService) {}
ngOnInit() {
  this.notifService.receiveAll().subscribe(() => {
    // بعد ما الكل اتعمل delivered صفر الكونتر في الـ layout
    this.resetParentCounter();
  });
  this.load();
}

resetParentCounter() {
  // نروح للـ layout ونصفر الكونتر
  const layoutComp = document.querySelector('app-admin-layout') as any;
  if (layoutComp?.__ngContext__) return;

  // الطريقة الأبسط: نبعت event
  window.dispatchEvent(new CustomEvent('notif-delivered'));
}
  load() {
    this.isLoading = true;
    this.notifService.getAll(1, 50, this.selectedType).subscribe({
      next: (res: any) => {
        this.notifications = res?.items ?? res?.data ?? res ?? [];
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  get unread() { return this.notifications.filter(n => !n.isRead).length; }

  markRead(n: any) {
    if (n.isRead) return;
    this.notifService.markAsRead(n.id).subscribe(() => n.isRead = true);
  }

  markAllRead() {
    this.notifService.markAllAsRead().subscribe(() => {
      this.notifications.forEach(n => n.isRead = true);
    });
  }

  delete(n: any) {
    this.notifService.delete(n.id).subscribe(() => {
      this.notifications = this.notifications.filter(x => x.id !== n.id);
    });
  }

  filterBy(type: number | undefined) {
    this.selectedType = type;
    this.load();
  }

  typeLabel(type: number): string {
    const map: Record<number, string> = { 1: 'Shipment Update' };
    return map[type] ?? 'Notification';
  }

  typeIcon(type: number): string {
    const map: Record<number, string> = { 1: 'bi-truck' };
    return map[type] ?? 'bi-bell';
  }

  typeColor(type: number): string {
    const map: Record<number, string> = { 1: 'icon-indigo' };
    return map[type] ?? 'icon-gray';
  }
}
