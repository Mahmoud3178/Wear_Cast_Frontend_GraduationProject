import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomerNavComponent } from '../shared/customer-nav/customer-nav.component';
import { CustomerFooterComponent } from '../shared/customer-footer/customer-footer.component';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, CustomerNavComponent, CustomerFooterComponent],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css'
})
export class CheckoutComponent { }

