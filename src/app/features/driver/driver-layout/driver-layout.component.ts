import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { DriverSidebarComponent } from '../components/driver-sidebar/driver-sidebar.component';
import { DriverHeaderComponent } from '../components/driver-header/driver-header.component';
import { DriverFooterComponent } from '../components/driver-footer/driver-footer.component';
import { NotificationsService } from '../../../core/services/notifications.service';

@Component({
  selector: 'app-driver-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DriverSidebarComponent,
    DriverHeaderComponent,
    DriverFooterComponent
  ],
  templateUrl: './driver-layout.component.html',
  styleUrls: ['./driver-layout.component.css']
})
export class DriverLayoutComponent implements OnInit, OnDestroy {
  isSidebarCollapsed = false;
  undeliveredCount = 0;

  private pollingInterval: any = null;
  private readonly onNotifDelivered = (): void => { this.undeliveredCount = 0; };
  private notifService = inject(NotificationsService);
  private router = inject(Router);

  ngOnInit() {
    this.isSidebarCollapsed = window.innerWidth < 992;
    this.loadUndeliveredCount();

    this.pollingInterval = setInterval(() => {
      this.loadUndeliveredCount();
    }, 30000);

    window.addEventListener('notif-delivered', this.onNotifDelivered);

    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        const url = e.urlAfterRedirects || e.url;
        if (url.includes('/driver/notifications')) {
          setTimeout(() => this.loadUndeliveredCount(), 500);
        }
      });
  }

  ngOnDestroy() {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    window.removeEventListener('notif-delivered', this.onNotifDelivered);
  }

  loadUndeliveredCount() {
    this.notifService.getUndeliveredCount().subscribe({
      next: (res: any) => {
        this.undeliveredCount = this.notifService.parseUndeliveredCount(res);
      },
      error: () => {}
    });
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
}
