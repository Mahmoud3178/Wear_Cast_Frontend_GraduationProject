import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HandelShipmentsForAdminService } from '../../../core/services/handel-shipments-for-admin.service';

@Component({
  selector: 'app-shipments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shipments.component.html',
  styleUrl: './shipments.component.css'
})
export class ShipmentsComponent implements OnInit {

  shipments: any[] = [];
  pageIndex = 1;
  pageSize = 10;
  totalPages = 1;

  filters = {
    customerFirstName: '',
    customerLastName: '',
    shipmentStatus: '',
    deliveryCity: '',
    minPrice: null as number | null,
    maxPrice: null as number | null,
    startDate: '',
    endDate: ''
  };

  constructor(
    private service: HandelShipmentsForAdminService,
    private router: Router
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    const params: any = { PageIndex: this.pageIndex, PageSize: this.pageSize };

    if (this.filters.customerFirstName) params['CustomerFirstName'] = this.filters.customerFirstName;
    if (this.filters.customerLastName)  params['CustomerLastName']  = this.filters.customerLastName;
    if (this.filters.shipmentStatus)    params['ShipmentStatus']    = this.filters.shipmentStatus;
    if (this.filters.deliveryCity)      params['DeliveryCity']      = this.filters.deliveryCity;
    if (this.filters.minPrice != null)  params['MinPrice']          = this.filters.minPrice;
    if (this.filters.maxPrice != null)  params['MaxPrice']          = this.filters.maxPrice;
    if (this.filters.startDate)         params['StartDate']         = this.filters.startDate;
    if (this.filters.endDate)           params['EndDate']           = this.filters.endDate;

    this.service.getShipments(params).subscribe((res: any) => {
      this.shipments = res.items;
      this.totalPages = res.pages ?? res.totalPages ?? 1;
    });
  }

  applyFilters() {
    this.pageIndex = 1;
    this.load();
  }

  resetFilters() {
    this.filters = {
      customerFirstName: '',
      customerLastName: '',
      shipmentStatus: '',
      deliveryCity: '',
      minPrice: null,
      maxPrice: null,
      startDate: '',
      endDate: ''
    };
    this.applyFilters();
  }

  clearFilter(key: keyof typeof this.filters) {
    (this.filters as any)[key] = key === 'minPrice' || key === 'maxPrice' ? null : '';
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return !!(
      this.filters.customerFirstName ||
      this.filters.customerLastName  ||
      this.filters.shipmentStatus    ||
      this.filters.deliveryCity      ||
      this.filters.minPrice != null  ||
      this.filters.maxPrice != null  ||
      this.filters.startDate         ||
      this.filters.endDate
    );
  }

  goToDetails(id: number) {
    this.router.navigate(['/admin/shipments', id]);
  }

  next() {
    if (this.pageIndex < this.totalPages) { this.pageIndex++; this.load(); }
  }

  prev() {
    if (this.pageIndex > 1) { this.pageIndex--; this.load(); }
  }
}
