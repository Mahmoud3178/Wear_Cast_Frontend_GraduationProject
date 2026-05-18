import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  NotificationItem,
  NOTIFICATION_SORT_NEWEST,
  NOTIFICATION_SORT_OLDEST,
  NotificationsService
} from '../../../core/services/notifications.service';

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

  notifications: NotificationItem[] = [];
  isLoading = false;
  errorMessage: string | null = null;

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

  private readonly notifService = inject(NotificationsService);
  private readonly route = inject(ActivatedRoute, { optional: true });

  ngOnInit(): void {
    const routeSubtitle = this.route?.snapshot.data['subtitle'];
    if (typeof routeSubtitle === 'string' && routeSubtitle.trim()) {
      this.pageSubtitle = routeSubtitle.trim();
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

  markRead(n: NotificationItem): void {
    if (n.isRead) return;
    this.notifService.markAsRead(n.id).subscribe({
      next: () => {
        n.isRead = true;
      }
    });
  }

  markAllRead(): void {
    this.notifService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => {
          n.isRead = true;
        });
      }
    });
  }

  delete(n: NotificationItem, event: Event): void {
    event.stopPropagation();
    this.notifService.delete(n.id).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(x => x.id !== n.id);
        this.totalCount = Math.max(0, this.totalCount - 1);
      }
    });
  }

  applyFilters(readFilter: ReadFilter, type?: number): void {
    this.readFilter = readFilter;
    this.selectedType = type;
    this.pageIndex = 1;
    this.load();
  }

  filterByType(type: number | undefined): void {
    this.applyFilters(this.readFilter, type);
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

  typeLabel(type: number): string {
    const map: Record<number, string> = {
      1: 'Shipment Update'
    };
    return map[type] ?? 'Notification';
  }

  typeIcon(type: number): string {
    const map: Record<number, string> = {
      1: 'bi-truck'
    };
    return map[type] ?? 'bi-bell';
  }

  typeColor(type: number): string {
    const map: Record<number, string> = {
      1: 'notif-icon--indigo'
    };
    return map[type] ?? 'notif-icon--muted';
  }
}
