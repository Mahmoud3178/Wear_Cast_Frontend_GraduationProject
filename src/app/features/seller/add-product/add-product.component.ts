import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-add-product',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './add-product.component.html',
  styleUrl: './add-product.component.css'
})
export class AddProductComponent {
 currentStep = 1;

  sizes = [
    { name: '2XS' },
    { name: 'XS' },
    { name: 'S' },
    { name: 'M' },
    { name: 'L' },
    { name: 'XL' },
    { name: '2XL' }
  ];

  nextStep() {
    this.currentStep = 2;
  }

  prevStep() {
    this.currentStep = 1;
  }}
