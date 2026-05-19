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

  shipmentItems: any[] = [];

  loadShipmentDetails() {
    this.isLoading = true;
    this.driverService.getDriverShipmentById(this.shipmentId).subscribe({
      next: (data) => {
        this.shipment = data;
        this.loadShipmentItems();
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

  loadShipmentItems() {
    this.driverService.getShipmentItems(this.shipmentId).subscribe({
      next: (res) => {
        const items: any[] = [];
        if (res) {
          // Parse fixed items
          const fixedPaged = res.fixedItems;
          const fixedList = fixedPaged?.items ?? [];
          fixedList.forEach((i: any) => {
            const orderId = i.sizes && i.sizes.length > 0 ? i.sizes[0].orderId : null;
            items.push({
              productName: i.productName || 'Fixed Product',
              quantity: i.totalQuantity || 1,
              unitPrice: i.unitPrice || 0,
              orderId: orderId,
              type: 'Fixed',
              colorName: i.colorName || 'Default',
              imageUrl: i.imageUrl || null,
              sizes: i.sizes || []
            });
          });

          // Parse designed items
          const designedPaged = res.designedItems;
          const designedList = designedPaged?.items ?? [];
          designedList.forEach((d: any) => {
            const orderId = d.sizes && d.sizes.length > 0 ? d.sizes[0].orderId : null;
            items.push({
              productName: d.productName || 'Designed Product',
              quantity: d.totalQuantity || 1,
              unitPrice: d.unitPrice || 0,
              orderId: orderId,
              type: 'Designed',
              colorName: d.colorName || 'Default',
              imageUrl: d.frontImageUrl || null,
              sizes: d.sizes || []
            });
          });
        }
        this.shipmentItems = items;

        // Populate shipment.orders with unique order IDs from the items dynamically
        if (this.shipment) {
          const uniqueOrderIds = Array.from(new Set(items.map(x => x.orderId).filter(id => id !== null && id !== undefined)));
          const currentShipmentStatusStr = this.shipment.shipmentStatus.toString();
          const isAlreadyPickedUp = currentShipmentStatusStr === 'OutForDelivery' || 
                                     currentShipmentStatusStr === '5' || 
                                     currentShipmentStatusStr === 'Delivered' || 
                                     currentShipmentStatusStr === '6';

          this.shipment.orders = uniqueOrderIds.map(orderId => {
            const localKey = `shipment_${this.shipmentId}_order_${orderId}_picked`;
            const wasPickedLocal = localStorage.getItem(localKey) === 'true';

            return {
              orderId: orderId as number,
              storeName: items.find(x => x.orderId === orderId)?.type === 'Fixed' ? 'WearCast Store' : 'Design Factory',
              itemsCount: items.filter(x => x.orderId === orderId).reduce((sum, current) => sum + current.quantity, 0),
              status: (isAlreadyPickedUp || wasPickedLocal) ? 'PickedUp' : 'Ready'
            };
          });
        }
      },
      error: (err) => {
        console.error('Failed to load shipment items', err);
      }
    });
  }

  loadMockData() {
    this.shipment = {
      id: this.shipmentId,
      deliveryAddress: {
        state: 'Gaza State',
        city: 'Gaza City',
        street: 'Al-Wehda Street',
        postalCode: '99000'
      },
      shipmentStatus: ShipmentStatus.OutForDelivery,
      orderedAt: new Date().toISOString(),
      customerName: 'Ahmed Ali',
      customerPhoneNumber: '+970599112233',
      orders: [
        { orderId: 201, storeName: 'WearCast Palestine Store', itemsCount: 3, status: 'Ready' },
        { orderId: 202, storeName: 'Google Merch Gaza Store', itemsCount: 1, status: 'Ready' }
      ]
    };

    this.shipmentItems = [
      {
        productName: 'Premium Casual T-Shirt',
        quantity: 2,
        unitPrice: 15.00,
        orderId: 201,
        type: 'Fixed',
        colorName: 'Indigo Blue',
        imageUrl: null,
        sizes: [{ sizeName: 'M', quantity: 2 }]
      },
      {
        productName: 'Signature Denim Jacket',
        quantity: 1,
        unitPrice: 45.00,
        orderId: 201,
        type: 'Fixed',
        colorName: 'Charcoal Black',
        imageUrl: null,
        sizes: [{ sizeName: 'L', quantity: 1 }]
      },
      {
        productName: 'Custom Designed Hoodie',
        quantity: 1,
        unitPrice: 35.00,
        orderId: 202,
        type: 'Designed',
        colorName: 'Teal Green',
        imageUrl: null,
        sizes: [{ sizeName: 'XL', quantity: 1 }]
      }
    ];
  }

  getNextStatus(): { value: ShipmentStatus; label: string; btnClass: string } | null {
    if (!this.shipment) return null;
    const statusStr = typeof this.shipment.shipmentStatus === 'number'
      ? this.shipment.shipmentStatus
      : ShipmentStatus[this.shipment.shipmentStatus as keyof typeof ShipmentStatus];

    const currentStatus = Number(statusStr);
    switch (currentStatus) {
      case ShipmentStatus.PickingUp:
        return { value: ShipmentStatus.OutForDelivery, label: 'Start Delivery Trip', btnClass: 'btn-primary bg-primary text-white' };
      case ShipmentStatus.OutForDelivery:
        return { value: ShipmentStatus.Delivered, label: 'Complete Delivery', btnClass: 'btn-success bg-success text-white' };
      default:
        return null;
    }
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

        let details = '';
        if (err.error) {
          if (typeof err.error === 'string') {
            details = err.error;
          } else {
            // Check for standard WearCast Api Result pattern
            const apiError = err.error.error || err.error;
            if (apiError && apiError.message) {
              details = `${apiError.message} (${apiError.code || 'Error'})`;
            } else if (err.error.message) {
              details = err.error.message;
            } else if (err.error.errors) {
              const errsObj = err.error.errors;
              details = Object.keys(errsObj)
                .map(key => `${key}: ${errsObj[key].join(', ')}`)
                .join('; ');
            } else if (err.error.title) {
              details = err.error.title;
            } else {
              details = JSON.stringify(err.error);
            }
          }
        } else if (err.message) {
          details = err.message;
        }

        const errorData = err.error?.error || err.error;
        if (errorData && errorData.code) {
          switch (errorData.code) {
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
              this.errorMessage = `Failed to update status. ${details}`;
          }
        } else {
          this.errorMessage = `Failed to update status. Details: ${details || 'Please try again.'}`;
        }
      }
    });
  }

  updateOrderPickedUp(orderId: number) {
    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true;

    this.driverService.updateOrderStatus(orderId, 6).subscribe({
      next: () => {
        this.isLoading = false;
        
        // Find order in our shipment list and update status
        const order = this.shipment?.orders.find(o => o.orderId === orderId);
        if (order) {
          order.status = 'PickedUp';
          localStorage.setItem(`shipment_${this.shipmentId}_order_${orderId}_picked`, 'true');
        }

        // If currently Assigned, transition local state to PickingUp as the backend does
        if (this.shipment) {
          const currentStatus = this.shipment.shipmentStatus.toString();
          if (currentStatus === '3' || currentStatus === 'Assigned') {
            this.shipment.shipmentStatus = ShipmentStatus.PickingUp;
          }
        }
        
        this.successMessage = `Order #${orderId} marked as Picked Up!`;
        setTimeout(() => this.successMessage = '', 3000);

        // Reload details to sync full state (like timestamps) from the backend
        this.loadShipmentDetails();
      },
      error: (err) => {
        console.error('Failed to update order status', err);
        this.isLoading = false;

        let details = '';
        if (err.error) {
          if (typeof err.error === 'string') {
            details = err.error;
          } else {
            // Check for standard WearCast Api Result pattern
            const apiError = err.error.error || err.error;
            if (apiError && apiError.message) {
              details = `${apiError.message} (${apiError.code || 'Error'})`;
            } else if (err.error.message) {
              details = err.error.message;
            } else if (err.error.errors) {
              const errsObj = err.error.errors;
              details = Object.keys(errsObj)
                .map(key => `${key}: ${errsObj[key].join(', ')}`)
                .join('; ');
            } else if (err.error.title) {
              details = err.error.title;
            } else {
              details = JSON.stringify(err.error);
            }
          }
        } else if (err.message) {
          details = err.message;
        }

        this.errorMessage = `Failed to mark Order #${orderId} as Picked Up. Details: ${details || 'Unknown error'}`;
      }
    });
  }

  isPickingUpStatus(): boolean {
    if (!this.shipment) return false;
    const s = this.shipment.shipmentStatus.toString();
    return s === '3' || s === 'Assigned' || s === '4' || s === 'PickingUp';
  }

  isDelivered(): boolean {
    if (!this.shipment) return false;
    const s = this.shipment.shipmentStatus.toString();
    return s === '6' || s === 'Delivered';
  }

  isAssignedStatus(): boolean {
    if (!this.shipment) return false;
    const s = this.shipment.shipmentStatus.toString();
    return s === '3' || s === 'Assigned';
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
