import { Component, OnInit } from '@angular/core';
import { NgClass, NgFor, NgIf, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import {
  FactoryApiService,
  FactoryWalletSummary
} from '../../../core/services/factory-api.service';

@Component({
  selector: 'app-factory-dashboard',
  standalone: true,
  imports: [RouterLink, NgIf, NgFor, NgClass, DecimalPipe],
  templateUrl: './factory-dashboard.component.html'
})
export class FactoryDashboardComponent implements OnInit {
  factoryId: number | null;
  totalOrders = 0;
  totalProducts = 0;
  loadingStats = false;
  statsError = '';
  wallet: FactoryWalletSummary | null = null;
  walletLoading = false;
  walletError = '';

  readonly quickLinks = [
    {
      icon: 'bi-plus-lg',
      title: 'Create product',
      subtitle:
        'Set canvas size, price, audiences, then add colors, 4 views, and sizes.',
      route: '/factory/products/new',
      iconClass: 'bg-dark text-white'
    },
    {
      icon: 'bi-grid-3x3-gap',
      title: 'Designed products',
      subtitle: 'Manage all templates linked to the customer design studio.',
      route: '/factory/products',
      iconClass: 'bg-secondary bg-opacity-10 text-dark'
    },
    {
      icon: 'bi-cart-check',
      title: 'Orders queue',
      subtitle: 'Track incoming manufacturing orders and inspect line items.',
      route: '/factory/orders',
      iconClass: 'bg-primary bg-opacity-10 text-primary'
    },
    {
      icon: 'bi-person-gear',
      title: 'Factory profile',
      subtitle: 'Update company info, manager details, and wallet activity.',
      route: '/factory/profile',
      iconClass: 'bg-success bg-opacity-10 text-success'
    }
  ];

  constructor(auth: AuthService, private readonly factoryApi: FactoryApiService) {
    this.factoryId = auth.getFactoryId();
  }

  ngOnInit(): void {
    this.loadStats();
    this.loadWalletSummary();
  }

  loadWalletSummary(): void {
    this.walletLoading = true;
    this.walletError = '';
    this.factoryApi.getFactoryWallet().subscribe({
      next: w => {
        this.wallet = w;
        this.walletLoading = false;
      },
      error: (err: Error) => {
        this.walletLoading = false;
        this.walletError = err.message || 'Could not load wallet.';
      }
    });
  }

  refreshDashboard(): void {
    this.loadStats();
    this.loadWalletSummary();
  }

  loadStats(): void {
    this.loadingStats = true;
    this.statsError = '';
    let pending = 2;
    const finishOne = () => {
      pending -= 1;
      if (pending <= 0) this.loadingStats = false;
    };
    this.factoryApi.getFactoryOrders(1, 200).subscribe({
      next: orders => {
        this.totalOrders = orders.length;
        finishOne();
      },
      error: () => {
        this.statsError = 'Could not load some dashboard stats.';
        finishOne();
      }
    });
    this.factoryApi.getDesignedProducts().subscribe({
      next: products => {
        this.totalProducts = products.length;
        finishOne();
      },
      error: () => {
        this.statsError = 'Could not load some dashboard stats.';
        finishOne();
      }
    });
  }
}
