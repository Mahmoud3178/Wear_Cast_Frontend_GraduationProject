import { Component, OnInit } from '@angular/core';
import { CustomerNavComponent } from '../shared/customer-nav/customer-nav.component';
import { CustomerFooterComponent } from '../shared/customer-footer/customer-footer.component';
import { NotificationsListComponent } from '../../../shared/components/notifications-list/notifications-list.component';
import { NotificationsService } from '../../../core/services/notifications.service';

@Component({
  selector: 'app-customer-notifications',
  standalone: true,
  imports: [CustomerNavComponent, CustomerFooterComponent, NotificationsListComponent],
  template: `
    <div class="customer-page-shell">
      <app-customer-nav></app-customer-nav>
      <main class="customer-notifications-main">
        <app-notifications-list
          pageSubtitle="Order updates, shipments, and account alerts"
        ></app-notifications-list>
      </main>
      <app-customer-footer></app-customer-footer>
    </div>
  `,
  styles: [`
    .customer-page-shell {
      min-height: 100vh;
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      background: #f8fcff;
    }

    .customer-notifications-main {
      flex: 1 1 auto;
      padding: 24px 16px 40px;
    }
  `]
})
export class CustomerNotificationsComponent implements OnInit {

  constructor(private readonly notifService: NotificationsService) {}

  ngOnInit(): void {
    this.notifService.receiveAll().subscribe(() => {
      window.dispatchEvent(new CustomEvent('notif-delivered'));
    });
  }
}
