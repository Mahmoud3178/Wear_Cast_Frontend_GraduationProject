import { AfterViewInit, Component, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CustomerNavComponent } from '../shared/customer-nav/customer-nav.component';
import { CustomerFooterComponent } from '../shared/customer-footer/customer-footer.component';
import { DesignCatalogService } from '../../../core/services/design-catalog.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  CustomerDesignService,
  type AddCustomerDesignRequest
} from '../../../core/services/customer-design.service';
import {
  CartService,
  type AddOrUpdateDesignedToCartRequest
} from '../../../core/services/cart.service';

@Component({
  selector: 'app-customer-design',
  standalone: true,
  imports: [CustomerNavComponent, CustomerFooterComponent],
  templateUrl: './design.component.html',
  styleUrls: ['./design.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class CustomerDesignComponent implements AfterViewInit {
  constructor(
    private readonly catalog: DesignCatalogService,
    private readonly auth: AuthService,
    private readonly route: ActivatedRoute,
    private readonly customerDesign: CustomerDesignService,
    private readonly cartService: CartService
  ) {}

  ngAfterViewInit(): void {
    const w = window as Window & {
      __WEARCAST_SAVE_CUSTOMER_DESIGN__?: (
        body: AddCustomerDesignRequest
      ) => Promise<number | null>;
      __WEARCAST_ADD_DESIGNED_TO_CART__?: (
        items: AddOrUpdateDesignedToCartRequest[]
      ) => Promise<void>;
      __WEARCAST_DESIGNS_STORAGE_KEY__?: string;
    };
    w.__WEARCAST_DESIGNS_STORAGE_KEY__ =
      'wearcast_designs:' + this.auth.getCustomerLocalDesignsScope();
    if (this.auth.getToken()) {
      w.__WEARCAST_SAVE_CUSTOMER_DESIGN__ = body =>
        firstValueFrom(this.customerDesign.saveDesign(body));
      w.__WEARCAST_ADD_DESIGNED_TO_CART__ = async (
        items: AddOrUpdateDesignedToCartRequest[]
      ) => {
        const sendLines = async (
          lines: AddOrUpdateDesignedToCartRequest[]
        ): Promise<void> => {
          for (const item of lines) {
            if (item.quantity < 1) {
              continue;
            }
            await firstValueFrom(this.cartService.addOrUpdateDesigned(item));
          }
        };
        try {
          await sendLines(items);
        } catch (err) {
          console.error('Failed to add to cart:', err);
          throw err;
        }
      };
    } else {
      delete w.__WEARCAST_SAVE_CUSTOMER_DESIGN__;
      delete w.__WEARCAST_ADD_DESIGNED_TO_CART__;
    }

    const token = this.auth.getToken();
    const extraIds = this.parseDesignedProductIds(
      this.route.snapshot.queryParamMap.get('designedProductIds')
    );
    this.catalog.loadDesignerBootstrap(token, { extraProductIds: extraIds }).subscribe({
      next: boot => {
        const w = window as unknown as {
          __WEARCAST_DESIGNER_BOOTSTRAP__?: {
            products: Record<string, unknown>;
            colors: string[];
          };
        };
        if (boot.products && Object.keys(boot.products).length > 0) {
          w.__WEARCAST_DESIGNER_BOOTSTRAP__ = {
            products: boot.products as Record<string, unknown>,
            colors: boot.colors
          };
        }
        this.runDesigner();
      },
      error: () => this.runDesigner()
    });
  }

  /** Comma-separated IDs, e.g. `?designedProductIds=12,34` so any browser can load templates without localStorage. */
  private parseDesignedProductIds(raw: string | null): number[] {
    if (!raw?.trim()) {
      return [];
    }
    return raw
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => Number.isFinite(n) && n > 0);
  }

  private runDesigner(): void {
    const w = window as any;
    if (typeof w.wearcastDesignerRun === 'function') {
      w.wearcastDesignerRun();
    } else {
      console.error('Wearcast designer script not loaded.');
    }
  }
}
