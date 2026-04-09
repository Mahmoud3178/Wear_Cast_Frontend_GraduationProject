import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CustomerNavComponent } from '../shared/customer-nav/customer-nav.component';
import { CustomerFooterComponent } from '../shared/customer-footer/customer-footer.component';

const LANDING_SEEN_KEY = 'wearcast:landingSeen';

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

  ngOnInit(): void {
    if (typeof localStorage !== 'undefined') {
      this.showLanding = !localStorage.getItem(LANDING_SEEN_KEY);
    }
  }

  ngAfterViewInit(): void {
    if (this.showLanding) {
      this.playLandingVideo();
    } else {
      queueMicrotask(() => this.playHomePromoVideo());
    }
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

    const rotateY = dx * 10;
    const rotateX = -dy * 10;

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
}
