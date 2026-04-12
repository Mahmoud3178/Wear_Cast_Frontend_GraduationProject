import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-customers-details',
  standalone: true,
  imports : [CommonModule,FormsModule,RouterLink],
  templateUrl: './customers-details.component.html',
  styleUrl: './customers-details.component.css'
})
export class CustomersDetailsComponent {

  customerId: any;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.customerId = this.route.snapshot.paramMap.get('id');
  }
}
