import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationsService } from '../../../../core/services/notifications.service';

@Component({
  selector: 'app-factory-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIf],
  templateUrl: './factory-layout.component.html',
  styleUrl: './factory-layout.component.css'
})
export class FactoryLayoutComponent implements OnInit, OnDestroy {
  undeliveredCount = 0;
  private routerSub?: Subscription;
  private readonly onNotifDelivered = (): void => {
    this.undeliveredCount = 0;
  };

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly notifService: NotificationsService
  ) {}

  ngOnInit(): void {
    this.loadUndeliveredCount();
    window.addEventListener('notif-delivered', this.onNotifDelivered);

    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        const url = e.urlAfterRedirects || e.url;
        if (url.includes('/factory/notifications')) {
          setTimeout(() => this.loadUndeliveredCount(), 500);
        }
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    window.removeEventListener('notif-delivered', this.onNotifDelivered);
  }

  loadUndeliveredCount(): void {
    this.notifService.getUndeliveredCount().subscribe({
      next: (res) => {
        this.undeliveredCount = this.notifService.parseUndeliveredCount(res);
      },
      error: () => {
        this.undeliveredCount = 0;
      }
    });
  }

  logout(): void {
    this.auth.logoutFactory();
  }
}
