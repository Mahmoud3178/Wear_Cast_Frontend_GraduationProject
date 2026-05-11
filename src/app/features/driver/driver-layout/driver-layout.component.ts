import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DriverSidebarComponent } from '../components/driver-sidebar/driver-sidebar.component';
import { DriverHeaderComponent } from '../components/driver-header/driver-header.component';
import { DriverFooterComponent } from '../components/driver-footer/driver-footer.component';

@Component({
  selector: 'app-driver-layout',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    DriverSidebarComponent, 
    DriverHeaderComponent,
    DriverFooterComponent
  ],
  templateUrl: './driver-layout.component.html',
  styleUrls: ['./driver-layout.component.css']
})
export class DriverLayoutComponent implements OnInit {
  isSidebarCollapsed = false;

  ngOnInit() {
    this.isSidebarCollapsed = window.innerWidth < 992;
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
}
