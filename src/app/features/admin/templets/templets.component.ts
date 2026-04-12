import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-templets',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './templets.component.html',
  styleUrl: './templets.component.css'
})
export class TempletsComponent {

  templates = [
    {
      name: 'Summer Vibe 2024',
      id: 'TMP-8832',
      desc: 'Vibrant collection template featuring bright floral...',
      date: 'Oct 24, 2023',
      img: 'https://via.placeholder.com/50'
    },
    {
      name: 'Winter Wool Essentials',
      id: 'TMP-9921',
      desc: 'Cozy and warm aesthetic focused on knitwear...',
      date: 'Oct 22, 2023',
      img: 'https://via.placeholder.com/50'
    },
    {
      name: 'Athleisure Dark Mode',
      id: 'TMP-4512',
      desc: 'Sleek, dark-themed layout designed for high...',
      date: 'Oct 20, 2023',
      img: 'https://via.placeholder.com/50'
    },
    {
      name: 'Classic Gentleman',
      id: 'TMP-3301',
      desc: 'Timeless and elegant design suitable for formal wear...',
      date: 'Oct 18, 2023',
      img: 'https://via.placeholder.com/50'
    },
    {
      name: 'Urban Street V1',
      id: 'TMP-7221',
      desc: 'Bold, graffiti-inspired layout for modern streetwear...',
      date: 'Oct 15, 2023',
      img: 'https://via.placeholder.com/50'
    }
  ];

}
