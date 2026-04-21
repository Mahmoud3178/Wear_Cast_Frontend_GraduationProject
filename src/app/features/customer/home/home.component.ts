import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { CustomerNavComponent } from '../shared/customer-nav/customer-nav.component';
import { CustomerFooterComponent } from '../shared/customer-footer/customer-footer.component';
import { environment } from '../../../../environments/environment';

const LANDING_SEEN_KEY = 'wearcast:landingSeen';

export interface NewArrivalProduct {
  id: number;
  name: string;
  imageUrl: string | null;
  price: number;
  category?: string;
}

@Component({
  selector: 'app-customer-home',
  standalone: true,
  imports: [CommonModule, RouterLink, CustomerNavComponent, CustomerFooterComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, AfterViewInit {
  @ViewChild('landingVideo') private landingVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('homePromoVideo') private homePromoVideo?: ElementRef<HTMLVideoElement>;

  /** Full-screen intro video on first visit only */
  showLanding = false;

  newArrivals: NewArrivalProduct[] = [];
  newArrivalsLoading = true;

  readonly productShowcase: ReadonlyArray<{
    label: string;
    image: string;
    link: string;
    blobClasses: string[];
  }> = [
    {
      label: 'T-Shirts',
      image: '/assets/Shirts.webp',
      link: '/customer/category',
      blobClasses: ['wc-blob', 'wc-blob--mint']
    },
    {
      label: 'Hoodies',
      image: '/assets/Hoodies.webp',
      link: '/customer/category',
      blobClasses: ['wc-blob', 'wc-blob--orange']
    },
    {
      label: 'Accessories',
      image: '/assets/Accessoires.webp',
      link: '/customer/category',
      blobClasses: ['wc-blob', 'wc-blob--pink']
    },
    {
      label: 'Sweatshirts',
      image: '/assets/Sweatshirts.webp',
      link: '/customer/category',
      blobClasses: ['wc-blob', 'wc-blob--yellow']
    },
    {
      label: 'Mugs & Drinkwear',
      image: '/assets/mug.webp',
      link: '/customer/category',
      blobClasses: ['wc-blob', 'wc-blob--purple', 'wc-blob--circle']
    },
    {
      label: 'Caps & Hats',
      image: '/assets/Caps.webp',
      link: '/customer/category',
      blobClasses: ['wc-blob', 'wc-blob--sky', 'wc-blob--cap']
    }
  ];

  readonly parallaxCards = [
    {
      title: 'Create',
      imageUrl: '/assets/create.png'
    },
    {
      title: 'Your',
      imageUrl: '/assets/your.png'
    },
    {
      title: 'Design',
      imageUrl: '/assets/design.png'
    }
  ] as const;

  readonly styleCards = [
    { label: 'Casual',  icon: '👕', desc: 'Everyday comfort', cls: 'wc-style-card--casual',  dressStyle: 0 },
    { label: 'Formal',  icon: '👔', desc: 'Clean & professional', cls: 'wc-style-card--formal',  dressStyle: 1 },
    { label: 'Party',   icon: '🎉', desc: 'Stand out & shine', cls: 'wc-style-card--party',   dressStyle: 2 },
    { label: 'Gym',     icon: '🏋️', desc: 'Performance wear', cls: 'wc-style-card--gym',     dressStyle: 3 },
    { label: 'Street',  icon: '🛹', desc: 'Urban & bold', cls: 'wc-style-card--street',  dressStyle: 4 },
    { label: 'Vintage', icon: '🧥', desc: 'Timeless classics', cls: 'wc-style-card--vintage', dressStyle: 5 },
  ];

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    if (typeof localStorage !== 'undefined') {
      this.showLanding = !localStorage.getItem(LANDING_SEEN_KEY);
    }
    this.loadNewArrivals();
  }

  ngAfterViewInit(): void {
    if (this.showLanding) {
      this.playLandingVideo();
    } else {
      queueMicrotask(() => this.playHomePromoVideo());
    }
  }

  private loadNewArrivals(): void {
    this.http.get<any>(`${environment.apiUrl}/api/FixedProduct/GetAll`, {
      params: { PageSize: 5, PageIndex: 1 }
    }).pipe(
      map(res => {
        let rows: any = res?.data ?? res;
        if (rows && typeof rows === 'object' && !Array.isArray(rows)) {
          rows = rows.items ?? rows.data ?? rows.products ?? rows;
        }
        if (!Array.isArray(rows)) return [];
        return rows.slice(0, 5).map((p: any) => ({
          id: p.id || p.Id,
          name: p.name || p.Name || p.productName || 'Product',
          imageUrl: p.imageUrl || p.ImageUrl || p.mainImageUrl || p.MainImageUrl ||
                    (p.colors?.[0]?.mainImageUrl) || (p.colors?.[0]?.imageUrl) || null,
          price: p.price || p.Price || p.basePrice || 0,
          category: p.categoryName || p.CategoryName || ''
        } as NewArrivalProduct));
      }),
      catchError(() => of([]))
    ).subscribe(products => {
      this.newArrivals = products;
      this.newArrivalsLoading = false;
    });
  }

  playLandingVideo(): void {
    const v = this.landingVideo?.nativeElement;
    if (!v || !this.showLanding) {
      return;
    }
    v.muted = true;
    v.defaultMuted = true;
    void v.play().catch(() => {});
  }

  playHomePromoVideo(): void {
    if (this.showLanding) {
      return;
    }
    const v = this.homePromoVideo?.nativeElement;
    if (!v) {
      return;
    }
    v.muted = true;
    v.defaultMuted = true;
    void v.play().catch(() => {});
  }

  enterHome(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LANDING_SEEN_KEY, '1');
    }
    this.showLanding = false;
    queueMicrotask(() => this.playHomePromoVideo());
  }

  onParallaxMove(event: MouseEvent) {
    const el = event.currentTarget as HTMLElement | null;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;

    const dx = (px - 0.5) * 2;
    const dy = (py - 0.5) * 2;

    const rotateY = -dx * 18;
    const rotateX = dy * 18;

    el.style.setProperty('--rx', `${rotateX}deg`);
    el.style.setProperty('--ry', `${rotateY}deg`);
    el.style.setProperty('--mx', `${px * 100}%`);
    el.style.setProperty('--my', `${py * 100}%`);
  }

  onParallaxLeave(event: MouseEvent) {
    const el = event.currentTarget as HTMLElement | null;
    if (!el) return;
    el.style.setProperty('--rx', `0deg`);
    el.style.setProperty('--ry', `0deg`);
    el.style.setProperty('--mx', `50%`);
    el.style.setProperty('--my', `35%`);
  }

  onParallaxClick(event: MouseEvent) {
    const el = event.currentTarget as HTMLElement | null;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    const dx = (px - 0.5) * 2;
    const dy = (py - 0.5) * 2;
    el.style.setProperty('--rx', `${-dy * 25}deg`);
    el.style.setProperty('--ry', `${dx * 25}deg`);
    el.style.setProperty('--scale', `0.97`);
  }

  onParallaxRelease(event: MouseEvent) {
    const el = event.currentTarget as HTMLElement | null;
    if (!el) return;
    el.style.setProperty('--scale', `1`);
    this.onParallaxMove(event);
  }
}
