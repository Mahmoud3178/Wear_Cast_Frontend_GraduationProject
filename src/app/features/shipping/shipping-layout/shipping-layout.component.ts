import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ShippingSidebarComponent } from '../components/shipping-sidebar/shipping-sidebar.component';
import { ShippingHeaderComponent } from '../components/shipping-header/shipping-header.component';
import { ShippingFooterComponent } from '../components/shipping-footer/shipping-footer.component';
import { NotificationsService } from '../../../core/services/notifications.service';

@Component({
  selector: 'app-shipping-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ShippingSidebarComponent,
    ShippingHeaderComponent,
    ShippingFooterComponent,
    RouterLink
  ],
  templateUrl: './shipping-layout.component.html',
  styleUrls: ['./shipping-layout.component.css']
})
export class ShippingLayoutComponent implements OnInit, OnDestroy {
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
        if (url.includes('/shipping/notifications')) {
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
