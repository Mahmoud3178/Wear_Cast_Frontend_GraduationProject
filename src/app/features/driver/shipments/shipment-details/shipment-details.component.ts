import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DriverService } from '../../../../core/services/driver.service';
import { DriverShipmentDetails, UpdateShipmentStatusRequest, ShipmentStatus } from '../../../../core/models/shipment.model';

@Component({
  selector: 'app-shipment-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './shipment-details.component.html',
  styleUrl: './shipment-details.component.css'
})
export class ShipmentDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private driverService = inject(DriverService);

  shipmentId!: number;
  shipment: DriverShipmentDetails | null = null;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  showCodePrompt = false;
  enteredCode = '';
  pendingStatus: ShipmentStatus | null = null;

  statusOptions = [
    { value: ShipmentStatus.PickingUp, label: 'Picking Up' },
    { value: ShipmentStatus.OutForDelivery, label: 'Out For Delivery' },
    { value: ShipmentStatus.Delivered, label: 'Delivered' }
  ];

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.shipmentId = +idParam;
      this.loadShipmentDetails();
    }
  }

  loadShipmentDetails() {
    this.isLoading = true;
    this.driverService.getDriverShipmentById(this.shipmentId).subscribe({
      next: (data) => {
        this.shipment = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load shipment details', err);
        this.errorMessage = 'Failed to load shipment details.';
        this.isLoading = false;
        // Fallback to mock data
        this.loadMockData();
      }
    });
  }

  loadMockData() {
    this.shipment = {
      id: this.shipmentId,
      trackingId: 'TRK-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      shipmentStatus: ShipmentStatus.OutForDelivery,
      deliveryCity: 'Lake Marco',
      deliveryStreet: 'Feest Turnpike',
      deliveryBuildingNumber: '870',
      receiverName: 'John Doe',
      receiverPhone: '0123456789',
      orderTime: new Date(),
      price: 45.5,
      items: [
        { productName: 'Premium T-Shirt', quantity: 2, price: 15 },
        { productName: 'Classic Jeans', quantity: 1, price: 15.5 }
      ]
    } as any;
  }

  updateStatus(newStatus: ShipmentStatus) {
    if (!this.shipment) return;

    this.errorMessage = '';
    this.successMessage = '';

    if (newStatus === ShipmentStatus.Delivered) {
      this.showCodePrompt = true;
      this.pendingStatus = newStatus;
      this.enteredCode = '';
      return;
    }

    this.executeStatusUpdate(newStatus);
  }

  cancelDelivery() {
    this.showCodePrompt = false;
    this.enteredCode = '';
    this.pendingStatus = null;
  }

  confirmDelivery() {
    if (!this.enteredCode.trim()) {
      this.errorMessage = 'Delivery code is required to complete delivery.';
      this.showCodePrompt = false;
      return;
    }
    this.showCodePrompt = false;
    this.executeStatusUpdate(this.pendingStatus!, this.enteredCode.trim());
  }

  executeStatusUpdate(newStatus: ShipmentStatus, deliveryCode?: string) {
    this.isLoading = true;
    const request: UpdateShipmentStatusRequest = {
      shipmentId: this.shipmentId,
      newStatus: newStatus,
      deliveryCode: deliveryCode
    };

    this.driverService.updateShipmentStatus(this.shipmentId, request).subscribe({
      next: () => {
        this.shipment!.shipmentStatus = newStatus;
        this.isLoading = false;
        this.successMessage = 'Status updated successfully!';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        console.error('Failed to update status', err);
        this.isLoading = false;
        
        const errorData = err.error;
        if (errorData && errorData.code) {
          switch(errorData.code) {
            case 'Shipment.NotReady':
              this.errorMessage = 'Cannot start trip: Some orders are not marked as "Ready" by the seller yet. Please contact the store.';
              break;
            case 'Shipment.NotPickedUp':
              this.errorMessage = 'Cannot go out for delivery: You must pick up all items from the store first.';
              break;
            case 'Shipment.WrongDeliveryCode':
              this.errorMessage = 'Incorrect Delivery Code. Please ask the customer for the correct code.';
              break;
            case 'Shipment.InvalidTransition':
              this.errorMessage = 'Invalid status transition. You cannot move to this status now.';
              break;
            default:
              this.errorMessage = errorData.message || 'Failed to update status.';
          }
        } else {
          this.errorMessage = 'Failed to update status. Please try again.';
        }
      }
    });
  }

  getStatusClass(status: any): string {
    const s = status.toString();
    if (s === 'Delivered' || s === '6' || s === ShipmentStatus.Delivered.toString()) return 'bg-success-soft text-success';
    if (s === 'OutForDelivery' || s === '5' || s === ShipmentStatus.OutForDelivery.toString()) return 'bg-primary-soft text-primary';
    if (s === 'PickingUp' || s === '4' || s === ShipmentStatus.PickingUp.toString()) return 'bg-warning-soft text-warning';
    if (s === 'Assigned' || s === '3' || s === ShipmentStatus.Assigned.toString()) return 'bg-info-soft text-info';
    return 'bg-slate-100 text-slate-500';
  }

  getStatusName(status: any): string {
    const s = status.toString();
    if (s === 'Delivered' || s === '6' || s === ShipmentStatus.Delivered.toString()) return 'Delivered';
    if (s === 'OutForDelivery' || s === '5' || s === ShipmentStatus.OutForDelivery.toString()) return 'Out For Delivery';
    if (s === 'PickingUp' || s === '4' || s === ShipmentStatus.PickingUp.toString()) return 'Picking Up';
    if (s === 'Assigned' || s === '3' || s === ShipmentStatus.Assigned.toString()) return 'Assigned';
    return s;
  }
}
