import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { NotificationsService } from './notifications.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class NotificationsPollingService implements OnDestroy {

  private interval: any = null;
  private _count = new BehaviorSubject<number>(0);
  count$ = this._count.asObservable();

  constructor(
    private notifService: NotificationsService,
    private auth: AuthService,
    private ngZone: NgZone
  ) {}

  start() {
    if (this.interval) return; // مش تبدأ تاني لو شغالة
    this.reload();
    this.ngZone.runOutsideAngular(() => {
      this.interval = setInterval(() => {
        this.ngZone.run(() => this.reload());
      }, 10000);
    });
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  reset() {
    this._count.next(0);
  }

  reload() {
    if (!this.auth.isLoggedIn()) { this._count.next(0); return; }
    // Fetch Unread Count instead of Undelivered Count
    this.notifService.getAll(1, 1, undefined, { isRead: false }).subscribe({
      next: (res) => {
        const parsed = this.notifService.parseListResponse(res);
        this._count.next(parsed.totalCount);
      },
      error: () => {}
    });
  }

  ngOnDestroy() { this.stop(); }
}
