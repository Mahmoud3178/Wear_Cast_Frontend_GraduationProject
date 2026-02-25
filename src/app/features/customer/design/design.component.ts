import { AfterViewInit, Component, ViewEncapsulation } from '@angular/core';
import { CustomerNavComponent } from '../shared/customer-nav/customer-nav.component';
import { CustomerFooterComponent } from '../shared/customer-footer/customer-footer.component';

@Component({
  selector: 'app-customer-design',
  standalone: true,
  imports: [CustomerNavComponent, CustomerFooterComponent],
  templateUrl: './design.component.html',
  styleUrls: ['./design.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class CustomerDesignComponent implements AfterViewInit {

  ngAfterViewInit(): void {
    const w = window as any;
    if (typeof w.wearcastDesignerRun === 'function') {
      w.wearcastDesignerRun();
    } else {
      console.error('Wearcast designer script not loaded.');
    }
  }
}

