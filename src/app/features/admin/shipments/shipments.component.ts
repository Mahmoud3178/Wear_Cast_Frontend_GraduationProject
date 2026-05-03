import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HandelShipmentsForAdminService } from '../../../core/services/handel-shipments-for-admin.service';

@Component({
  selector: 'app-shipments',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shipments.component.html',
  styleUrl: './shipments.component.css'
})
export class ShipmentsComponent implements OnInit {

  shipments: any[] = [];

  pageIndex = 1;
  pageSize = 10;
  totalPages = 1;

  constructor(
    private service: HandelShipmentsForAdminService,
    private router: Router
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.service.getShipments(this.pageIndex, this.pageSize).subscribe((res: any) => {
      this.shipments = res.items;
      this.totalPages = res.pages;
    });
  }

  goToDetails(id: number) {
    this.router.navigate(['/admin/shipments', id]);
  }

  next() {
    if (this.pageIndex < this.totalPages) {
      this.pageIndex++;
      this.load();
    }
  }

  prev() {
    if (this.pageIndex > 1) {
      this.pageIndex--;
      this.load();
    }
  }
}
