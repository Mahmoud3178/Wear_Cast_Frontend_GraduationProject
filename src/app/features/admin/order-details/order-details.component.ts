import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-details.component.html',
  styleUrl: './order-details.component.css'
})
export class OrderDetailsComponent {

  order: any;

  constructor(
    private route: ActivatedRoute,
    private adminService: AdminService
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadOrder(id);
  }

  loadOrder(id: number) {
    this.adminService.getOrderById(id).subscribe({
      next: (res: any) => {

        const data = res?.data ?? res;

        this.order = {
          ...data,

          // 🔥 fallback
          orderType: data.orderType || 'Unknown',

          items: data.items || [],

          designedItems: (data.designedItems || []).map((x: any) => ({
            ...x,
            type: x.orderItemType || 'Unknown',

            // 🔥 مهم لعرض المقاسات بشكل كويس
            sizesFormatted: this.formatSizes(x.sizes)
          }))
        };

      }
    });
  }

  // 🔥 تحويل المقاسات لشكل جميل
  formatSizes(sizes: any[]): string {
    if (!sizes || !sizes.length) return '';

    return sizes
      .map(s => `${s.quantity} × ${s.sizeName.replace('_','')}`)
      .join(' , ');
  }
}
