import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CustomerNavComponent } from '../shared/customer-nav/customer-nav.component';
import { CustomerFooterComponent } from '../shared/customer-footer/customer-footer.component';
import { FavouritesService, FavouriteItem } from '../../../core/services/favourites.service';


@Component({
  selector: 'app-favourites',
  standalone: true,
  imports: [CommonModule, RouterLink, CustomerNavComponent, CustomerFooterComponent],
  templateUrl: './favourites.component.html',
  styleUrl: './favourites.component.css'
})
export class FavouritesComponent implements OnInit {
  private readonly favouritesService = inject(FavouritesService);

  // State
  loading = true;
  error = '';
  favourites: FavouriteItem[] = [];
  total = 0;

  // Removal state
  removingId: number | null = null;
  removeMessage = '';
  removeError = '';

  ngOnInit(): void {
    this.loadFavourites();
  }

  loadFavourites(): void {
    this.loading = true;
    this.error = '';

    this.favouritesService.getAll().subscribe({
      next: response => {
        this.loading = false;
        this.favourites = response.items;
        this.total = response.total;
      },
      error: () => {
        this.loading = false;
        this.error = 'Failed to load favourites. Please try again.';
      }
    });
  }

  removeFromFavourites(item: FavouriteItem): void {
    if (this.removingId === item.fixedProductColorId) return;

    this.removingId = item.fixedProductColorId;
    this.removeMessage = '';
    this.removeError = '';

    this.favouritesService.removeFromFavourites(item.fixedProductColorId).subscribe({
      next: success => {
        this.removingId = null;
        if (success) {
          this.favourites = this.favourites.filter(f => f.fixedProductColorId !== item.fixedProductColorId);
          this.total--;
          this.removeMessage = 'Removed from favourites';
          setTimeout(() => this.removeMessage = '', 3000);
        } else {
          this.removeError = 'Failed to remove from favourites';
        }
      },
      error: () => {
        this.removingId = null;
        this.removeError = 'Failed to remove from favourites';
      }
    });
  }

  formatSize(s: string): string {
    return s.replace(/^_/, '');
  }
}
