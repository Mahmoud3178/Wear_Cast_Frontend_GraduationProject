import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-delivery-company',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './delivery-company.component.html',
  styleUrl: './delivery-company.component.css'
})
export class DeliveryCompanyComponent {

  stats = [
    {
      title: 'Total Deliveries',
      value: '14,203',
      change: '+12%',
      desc: 'Compared to last month',
      color: 'success'
    },
    {
      title: 'Avg. Delivery Time',
      value: '2.4 Days',
      change: '-4h',
      desc: 'Within expected range',
      color: 'success'
    },
    {
      title: 'On-Time Rate',
      value: '96.5%',
      change: '-1.2%',
      desc: 'Target: 98.0%',
      color: 'danger'
    },
    {
      title: 'Active Partners',
      value: '1',
      change: 'Single',
      desc: 'Primary Logistics Provider',
      color: 'primary'
    }
  ];

}
