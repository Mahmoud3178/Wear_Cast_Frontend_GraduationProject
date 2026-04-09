import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { DesignCatalogService } from '../../../core/services/design-catalog.service';
import { FactoryApiService } from '../../../core/services/factory-api.service';
import { AuthService } from '../../../core/services/auth.service';

function pickProductName(dto: Record<string, unknown>, id: number): string {
  const keys = [
    'name',
    'Name',
    'productName',
    'ProductName',
    'title',
    'Title'
  ];
  for (const k of keys) {
    const v = dto[k];
    if (typeof v === 'string' && v.trim()) {
      return v.trim();
    }
  }
  return `Designed product #${id}`;
}

@Component({
  selector: 'app-factory-products',
  standalone: true,
  imports: [RouterLink, NgFor, NgIf],
  templateUrl: './factory-products.component.html'
})
export class FactoryProductsComponent implements OnInit {
  items: { id: number; name: string }[] = [];
  loading = false;
  deletingId: number | null = null;
  deleteError = '';

  constructor(
    private readonly catalog: DesignCatalogService,
    private readonly factory: FactoryApiService,
    private readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    this.refreshList();
  }

  refreshList(): void {
    this.deleteError = '';
    this.loading = true;
    this.factory.getDesignedProducts().subscribe({
      next: (rows) => {
        this.items = rows;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  deleteProduct(item: { id: number; name: string }): void {
    if (
      !confirm(
        `Delete "${item.name}" from the server? This cannot be undone.`
      )
    ) {
      return;
    }
    this.deleteError = '';
    this.deletingId = item.id;
    this.factory.deleteDesignedProduct(item.id).subscribe({
      next: () => {
        this.deletingId = null;
        this.catalog.unregisterDesignedProductId(item.id);
        this.items = this.items.filter(i => i.id !== item.id);
      },
      error: (e: Error) => {
        this.deletingId = null;
        this.deleteError =
          e.message || 'Delete failed. The API may not support DELETE yet.';
      }
    });
  }

  /** Optional query for <a routerLink> so other browsers load the same template IDs. */
  get designStudioQueryParams(): { designedProductIds: string } | null {
    const ids = this.items.map(i => i.id);
    return ids.length
      ? { designedProductIds: ids.join(',') }
      : null;
  }
}
