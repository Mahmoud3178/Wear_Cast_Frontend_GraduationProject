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
    this.load();
    this.ngZone.runOutsideAngular(() => {
      this.interval = setInterval(() => {
        this.ngZone.run(() => this.load());
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

  private load() {
    if (!this.auth.isLoggedIn()) { this._count.next(0); return; }
    this.notifService.getUndeliveredCount().subscribe({
      next: (res) => {
        this._count.next(this.notifService.parseUndeliveredCount(res));
      },
      error: () => {}
    });
  }

  ngOnDestroy() { this.stop(); }
}
