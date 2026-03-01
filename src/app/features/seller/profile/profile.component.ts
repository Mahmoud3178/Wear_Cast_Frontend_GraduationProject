import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent {

  seller = {
    name: 'Premium Fashion Store',
    registration: 'SEL-00234-TX',
    description: 'Premium provider of high-quality fashion apparel and accessories.',
    address: '456 Fashion Avenue, Downtown',
    city: 'New York',
    zip: '10001',
    phone: '+1 (212) 555-0198',
    email: 'contact@premiumfashion.com'
  };
  logoPreview: string | ArrayBuffer | null = null;

onLogoChange(event: any) {
  const file = event.target.files[0];

  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      this.logoPreview = reader.result;
    };
    reader.readAsDataURL(file);
  }
}
}
