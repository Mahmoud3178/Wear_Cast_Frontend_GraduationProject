import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ShippingSidebarComponent } from '../components/shipping-sidebar/shipping-sidebar.component';
import { ShippingHeaderComponent } from '../components/shipping-header/shipping-header.component';
import { ShippingFooterComponent } from '../components/shipping-footer/shipping-footer.component';

@Component({
  selector: 'app-shipping-layout',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    ShippingSidebarComponent, 
    ShippingHeaderComponent,
    ShippingFooterComponent
  ],
  templateUrl: './shipping-layout.component.html',
  styleUrls: ['./shipping-layout.component.css']
})
export class ShippingLayoutComponent implements OnInit {
  isSidebarCollapsed = false;

  ngOnInit() {
    this.isSidebarCollapsed = window.innerWidth < 992;
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
}
