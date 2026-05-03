import { isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, Subscription } from 'rxjs';

const BABY_THEME_CLASS = 'wc-theme-baby-blue';

/** True for customer, factory (incl. auth), `/login`, and customer email confirmation only. */
export function wearCastBabyBlueThemeActive(url: string): boolean {
  const path = url.split(/[?#]/)[0] || '';

  if (path.startsWith('/admin')) return false;
  if (path.startsWith('/seller')) return false;
  if (path.startsWith('/shipping')) return false;
  if (path.startsWith('/driver')) return false;

  if (path === '/login') return true;
  if (path.startsWith('/confirm-email/customer')) return true;
  if (path.startsWith('/customer')) return true;
  if (path.startsWith('/factory')) return true;

  return false;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Graduation_Project';
  private routerSub?: Subscription;

  constructor(
    private readonly router: Router,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const sync = (): void => {
      const active = wearCastBabyBlueThemeActive(this.router.url);
      document.body.classList.toggle(BABY_THEME_CLASS, active);
    };

    sync();
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => sync());
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }
}
