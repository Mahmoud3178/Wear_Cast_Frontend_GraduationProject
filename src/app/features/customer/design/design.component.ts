import { AfterViewInit, Component } from '@angular/core';

@Component({
  selector: 'app-customer-design',
  standalone: true,
  imports: [],
  templateUrl: './design.component.html',
  styleUrl: './design.component.css'
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

