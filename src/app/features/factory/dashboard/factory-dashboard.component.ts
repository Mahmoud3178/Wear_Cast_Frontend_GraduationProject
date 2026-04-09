import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-factory-dashboard',
  standalone: true,
  imports: [RouterLink, NgIf],
  templateUrl: './factory-dashboard.component.html'
})
export class FactoryDashboardComponent {
  factoryId: number | null;

  constructor(auth: AuthService) {
    this.factoryId = auth.getFactoryId();
  }
}
