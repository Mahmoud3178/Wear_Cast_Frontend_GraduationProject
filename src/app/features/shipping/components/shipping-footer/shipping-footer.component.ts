import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-shipping-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="shipping-footer px-4 py-3 border-top bg-white bg-opacity-75">
      <div class="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
        <div class="text-xs text-muted fw-medium">
          &copy; 2024 <span class="text-primary fw-bold">WearCast</span>. Logistics Management System v1.0
        </div>
        <div class="d-flex gap-4 text-xs">
          <a href="#" class="text-decoration-none text-muted transition-all hover-primary">Privacy</a>
          <a href="#" class="text-decoration-none text-muted transition-all hover-primary">Terms</a>
          <a href="#" class="text-decoration-none text-muted transition-all hover-primary">Help Center</a>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .text-xs {
      font-size: 0.75rem;
    }
    .hover-primary:hover {
      color: var(--bs-primary) !important;
    }
    .transition-all {
      transition: all 0.2s ease;
    }
  `]
})
export class ShippingFooterComponent {}
