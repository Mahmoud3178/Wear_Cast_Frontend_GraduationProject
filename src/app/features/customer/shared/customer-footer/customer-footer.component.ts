import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-customer-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './customer-footer.component.html',
  styleUrl: './customer-footer.component.css'
})
export class CustomerFooterComponent { }

