import { CommonModule } from '@angular/common';
import { Component, AfterViewInit } from '@angular/core';
import { Chart } from 'chart.js/auto';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements AfterViewInit {

  stats = [
    { title: 'Total Revenue', value: '$12,450', change: '+12%', positive: true },
    { title: 'Total Orders', value: '342', change: '+5%', positive: true },
    { title: 'Total Listed', value: '150', change: '', positive: true },
    { title: 'Approved Products', value: '145', change: '', positive: true },
    { title: 'Pending Approval', value: '5', change: '', positive: false }
  ];

  ngAfterViewInit(): void {
    this.createLineChart();
    this.createBarChart();
  }

  createLineChart() {
    new Chart('lineChart', {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          data: [10, 25, 15, 30, 20, 40],
          fill: false,
          tension: 0.4
        }]
      },
      options: {
        plugins: { legend: { display: false } }
      }
    });
  }

  createBarChart() {
    new Chart('barChart', {
      type: 'bar',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu'],
        datasets: [{
          data: [50, 80, 30, 100]
        }]
      },
      options: {
        plugins: { legend: { display: false } }
      }
    });
  }
}
