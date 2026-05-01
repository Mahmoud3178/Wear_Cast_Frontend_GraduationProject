import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { DriverSidebarComponent } from '../components/driver-sidebar/driver-sidebar.component';
import { DriverHeaderComponent } from '../components/driver-header/driver-header.component';
import { DriverFooterComponent } from '../components/driver-footer/driver-footer.component';

@Component({
  selector: 'app-driver-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    DriverSidebarComponent,
    DriverHeaderComponent,
    DriverFooterComponent
  ],
  templateUrl: './driver-layout.component.html',
  styleUrl: './driver-layout.component.css'
})
export class DriverLayoutComponent {
  isSidebarCollapsed = false;

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
}
