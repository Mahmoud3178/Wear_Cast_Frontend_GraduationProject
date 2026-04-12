import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-store-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './store-details.component.html',
  styleUrl: './store-details.component.css'
})
export class StoreDetailsComponent {

  storeId!: string;
  store: any;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.storeId = this.route.snapshot.paramMap.get('id')!;
    this.loadStore();
  }

  loadStore() {
    // mock data (بدل API)
    this.store = {
      id: this.storeId,
      name: 'The Corner Store',
      status: 'Pending',
      email: 'store@mail.com',
      phone: '+123456789',
      address: 'Cairo, Egypt',
      createdAt: 'Aug 12, 2023',
      documents: [
        { name: 'Business License.pdf' },
        { name: 'ID Front.jpg' },
        { name: 'ID Back.jpg' }
      ],
      history: [
        { text: 'Store Created', color: 'text-primary' },
        { text: 'Status set to Pending', color: 'text-warning' }
      ]
    };
  }

  approveStore() {
    this.store.status = 'Approved';
  }

  banStore() {
    this.store.status = 'Banned';
  }
}
