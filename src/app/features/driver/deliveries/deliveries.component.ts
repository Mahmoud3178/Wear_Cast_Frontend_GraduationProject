import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DriverService } from '../../../core/services/driver.service';
import { DriverShipment, ShipmentStatus, UpdateShipmentStatusRequest } from '../../../core/models/shipment.model';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-deliveries',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './deliveries.component.html',
  styleUrl: './deliveries.component.css'
})
export class DeliveriesComponent implements OnInit {
  private driverService = inject(DriverService);

  deliveries = signal<(DriverShipment & { isExpanded?: boolean })[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  // Status mapping
  ShipmentStatusEnum = ShipmentStatus;

  ngOnInit(): void {
    this.loadDeliveries();
  }

  public loadDeliveries() {
    this.isLoading.set(true);
    this.error.set(null);
    this.driverService.getAllDriverShipments().subscribe({
      next: (data) => {
        // Initialize all as collapsed
        const mappedData = data.map(d => ({ ...d, isExpanded: false }));
        // Sort: Active ones first
        mappedData.sort((a, b) => {
           const activeStatuses = [ShipmentStatus.OutForDelivery, ShipmentStatus.PickingUp, ShipmentStatus.Assigned];
           const aActive = activeStatuses.includes(a.shipmentStatus) ? -1 : 1;
           const bActive = activeStatuses.includes(b.shipmentStatus) ? -1 : 1;
           return aActive - bActive;
        });
        this.deliveries.set(mappedData);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load deliveries', err);
        this.error.set('Failed to load your deliveries. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  public toggleExpand(delivery: any) {
    delivery.isExpanded = !delivery.isExpanded;
  }

  public updateStatus(delivery: DriverShipment, newStatus: ShipmentStatus) {
    const request: UpdateShipmentStatusRequest = {
      shipmentId: delivery.id,
      newStatus: newStatus
    };
    
    // Optimistic update
    const previousStatus = delivery.shipmentStatus;
    delivery.shipmentStatus = newStatus;
    
    this.driverService.updateShipmentStatus(delivery.id, request).subscribe({
      next: () => {
        // Refresh to get accurate current list
        this.loadDeliveries();
      },
      error: (err) => {
        console.error('Failed to update status', err);
        delivery.shipmentStatus = previousStatus; // Revert
        alert('Failed to update shipment status.');
      }
    });
  }

  public getStatusText(status: ShipmentStatus): string {
    switch (status) {
      case ShipmentStatus.Pending: return 'Pending';
      case ShipmentStatus.Unassigned: return 'Unassigned';
      case ShipmentStatus.Assigned: return 'Assigned';
      case ShipmentStatus.PickingUp: return 'Picking Up';
      case ShipmentStatus.OutForDelivery: return 'Out For Delivery';
      case ShipmentStatus.Delivered: return 'Delivered';
      default: return 'Unknown';
    }
  }
}
