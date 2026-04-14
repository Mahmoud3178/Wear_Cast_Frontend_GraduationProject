import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-logos',
  standalone: true,
  imports: [CommonModule,RouterLink],
  templateUrl: './logos.component.html',
  styleUrl: './logos.component.css'
})
export class LogosComponent {

  logos = [
    {
      name: 'Primary Brand Logo',
      file: 'logo-primary.svg',
      size: '24 KB • SVG',
      status: 'Active',
      tags: ['HEADER', 'WEBSITE']
    },
    {
      name: 'Favicon / App Icon',
      file: 'favicon.png',
      size: '12 KB • PNG',
      status: 'Active',
      tags: ['BROWSER', 'MOBILE']
    },
    {
      name: 'Partner: Wool & Co',
      file: 'partner-wool.svg',
      size: '45 KB • SVG',
      status: 'Active',
      tags: ['PARTNER', 'FOOTER']
    },
    {
      name: 'Partner: Urban Threads',
      file: 'urban.jpg',
      size: '105 KB • JPG',
      status: 'Active',
      tags: ['PARTNER', 'PRODUCT']
    },
    {
      name: 'Summer Sale Badge',
      file: 'sale.svg',
      size: '32 KB • SVG',
      status: 'Inactive',
      tags: ['CAMPAIGN', 'MARKETING']
    }
  ];

}
