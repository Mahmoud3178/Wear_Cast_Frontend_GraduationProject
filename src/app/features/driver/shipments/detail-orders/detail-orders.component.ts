import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DriverService } from '../../../../core/services/driver.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ShipmentStatus } from '../../../../core/models/shipment.model';
import { forkJoin, map, of } from 'rxjs';

interface DetailedOrder {
  orderId: number;
  shipmentId: number;
  customerName: string;
  customerPhoneNumber: string;
  deliveryCity: string;
  deliveryStreet: string;
  deliveryState: string;
  deliveryBuilding?: string;
  storeName: string;
  itemsCount: number;
  status: string;
  orderTime: string;
  shipmentStatus: any;
  items: any[];
}

@Component({
  selector: 'app-detail-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './detail-orders.component.html',
  styleUrl: './detail-orders.component.css'
})
export class DetailOrdersComponent implements OnInit {
  private driverService = inject(DriverService);
  private authService = inject(AuthService);

  isLoading = false;
  errorMessage = '';
  successMessage = '';
  searchQuery = '';
  
  allOrders: DetailedOrder[] = [];
  filteredOrders: DetailedOrder[] = [];

  get totalOrdersCount(): number {
    return this.allOrders.length;
  }

  get readyOrdersCount(): number {
    return this.allOrders.filter(o => o.status === 'Ready').length;
  }

  get pickedUpOrdersCount(): number {
    return this.allOrders.filter(o => o.status === 'PickedUp').length;
  }

  get activeShipmentsCount(): number {
    const shipmentIds = this.allOrders.map(o => o.shipmentId);
    return new Set(shipmentIds).size;
  }

  ngOnInit(): void {
    this.loadAllOrders();
  }

  loadAllOrders() {
    const driverId = this.authService.getDriverId();
    if (!driverId) {
      this.errorMessage = 'Driver profile session not found.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Step 1: Load all driver shipments
    this.driverService.getAllDriverShipments(driverId).subscribe({
      next: (shipments) => {
        if (!shipments || shipments.length === 0) {
          this.allOrders = [];
          this.filteredOrders = [];
          this.isLoading = false;
          return;
        }

        // Step 2: Fetch detailed items for all active/non-delivered shipments
        const itemRequests = shipments.map(s => {
          return this.driverService.getShipmentItems(s.id).pipe(
            map(res => ({ shipment: s, itemsResponse: res }))
          );
        });

        forkJoin(itemRequests).subscribe({
          next: (results) => {
            const consolidatedOrders: DetailedOrder[] = [];

            results.forEach(({ shipment, itemsResponse }) => {
              if (!itemsResponse) return;

              // Parse items to extract unique orders
              const parsedItems: any[] = [];
              
              // Standard fixed store items
              const fixedPaged = itemsResponse.fixedItems ?? itemsResponse.FixedItems;
              const fixedList = fixedPaged?.items ?? fixedPaged?.Items ?? [];
              fixedList.forEach((i: any) => {
                const sizesList = i.sizes ?? i.Sizes ?? [];
                const orderId = sizesList && sizesList.length > 0 ? sizesList[0].orderId ?? sizesList[0].OrderId : null;
                parsedItems.push({
                  productName: i.productName || i.ProductName || 'Fixed Product',
                  quantity: i.totalQuantity || i.TotalQuantity || 1,
                  unitPrice: i.unitPrice || i.UnitPrice || 0,
                  orderId: orderId,
                  type: 'Fixed',
                  colorName: i.colorName || i.ColorName || 'Default',
                  imageUrl: i.imageUrl || i.ImageUrl || null
                });
              });

              // Custom designed garments items
              const designedPaged = itemsResponse.designedItems ?? itemsResponse.DesignedItems;
              const designedList = designedPaged?.items ?? designedPaged?.Items ?? [];
              designedList.forEach((d: any) => {
                const sizesList = d.sizes ?? d.Sizes ?? [];
                const orderId = sizesList && sizesList.length > 0 ? sizesList[0].orderId ?? sizesList[0].OrderId : null;
                parsedItems.push({
                  productName: d.productName || d.ProductName || 'Designed Product',
                  quantity: d.totalQuantity || d.TotalQuantity || 1,
                  unitPrice: d.unitPrice || d.UnitPrice || 0,
                  orderId: orderId,
                  type: 'Designed',
                  colorName: d.colorName || d.ColorName || 'Default',
                  imageUrl: d.frontImageUrl || d.FrontImageUrl || null
                });
              });

              // Extract unique orders in this shipment
              const uniqueOrderIds = Array.from(new Set(parsedItems.map(x => x.orderId).filter(id => id !== null && id !== undefined)));
              
              const currentStatusStr = shipment.shipmentStatus.toString();
              const isAlreadyPickedUp = currentStatusStr === 'OutForDelivery' || 
                                         currentStatusStr === '5' || 
                                         currentStatusStr === 'Delivered' || 
                                         currentStatusStr === '6';

              uniqueOrderIds.forEach(orderId => {
                const localKey = `shipment_${shipment.id}_order_${orderId}_picked`;
                const wasPickedLocal = localStorage.getItem(localKey) === 'true';
                const orderItems = parsedItems.filter(x => x.orderId === orderId);

                consolidatedOrders.push({
                  orderId: orderId as number,
                  shipmentId: shipment.id,
                  customerName: shipment.customerName || 'Customer',
                  customerPhoneNumber: shipment.customerPhoneNumber || '',
                  deliveryCity: shipment.deliveryCity || '',
                  deliveryStreet: shipment.deliveryStreet || '',
                  deliveryState: '',
                  deliveryBuilding: (shipment as any).deliveryBuildingNumber ?? (shipment as any).buildingNumber,
                  storeName: orderItems.find(x => x.orderId === orderId)?.type === 'Fixed' ? 'WearCast Store' : 'Design Factory',
                  itemsCount: orderItems.reduce((sum, item) => sum + item.quantity, 0),
                  status: (isAlreadyPickedUp || wasPickedLocal) ? 'PickedUp' : 'Ready',
                  orderTime: shipment.orderTime ?? new Date().toISOString(),
                  shipmentStatus: shipment.shipmentStatus,
                  items: orderItems
                });
              });
            });

            // Sort orders by order time descending
            this.allOrders = consolidatedOrders.sort((a, b) => new Date(b.orderTime).getTime() - new Date(a.orderTime).getTime());
            this.applyFilter();
            this.isLoading = false;
          },
          error: (err) => {
            console.error('Failed to resolve shipment items', err);
            this.errorMessage = 'Failed to load granular order contents.';
            this.isLoading = false;
          }
        });
      },
      error: (err) => {
        console.error('Failed to load active shipments', err);
        this.errorMessage = 'Failed to load driver shipments.';
        this.isLoading = false;
      }
    });
  }

  applyFilter() {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredOrders = [...this.allOrders];
      return;
    }

    this.filteredOrders = this.allOrders.filter(o => 
      o.orderId.toString().includes(q) ||
      o.shipmentId.toString().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.deliveryCity.toLowerCase().includes(q) ||
      o.storeName.toLowerCase().includes(q) ||
      o.status.toLowerCase().includes(q)
    );
  }

  updateOrderPickedUp(order: DetailedOrder) {
    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true;

    this.driverService.updateOrderStatus(order.orderId, 6).subscribe({
      next: () => {
        this.isLoading = false;
        order.status = 'PickedUp';
        localStorage.setItem(`shipment_${order.shipmentId}_order_${order.orderId}_picked`, 'true');
        
        this.successMessage = `Order #${order.orderId} marked as Picked Up!`;
        setTimeout(() => this.successMessage = '', 3000);
        
        // Reload details to sync full parent shipment state from backend
        this.loadAllOrders();
      },
      error: (err) => {
        console.error('Failed to update order status', err);
        this.isLoading = false;
        
        let details = '';
        if (err.error) {
          if (typeof err.error === 'string') {
            details = err.error;
          } else {
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

        this.errorMessage = `Failed to mark Order #${order.orderId} as Picked Up. Details: ${details || 'Unknown error'}`;
      }
    });
  }

  isPickingUpStatus(order: DetailedOrder): boolean {
    const s = order.shipmentStatus.toString();
    return s === '3' || s === 'Assigned' || s === '4' || s === 'PickingUp';
  }

  getShipmentStatusName(status: any): string {
    const s = status.toString();
    if (s === 'Delivered' || s === '6') return 'Delivered';
    if (s === 'OutForDelivery' || s === '5') return 'Out for Delivery';
    if (s === 'PickingUp' || s === '4') return 'Picking Up';
    if (s === 'Assigned' || s === '3') return 'Assigned';
    return s;
  }

  getShipmentStatusClass(status: any): string {
    const s = status.toString();
    if (s === 'Delivered' || s === '6') return 'bg-success-soft text-success';
    if (s === 'OutForDelivery' || s === '5') return 'bg-primary-soft text-primary';
    if (s === 'PickingUp' || s === '4') return 'bg-warning-soft text-warning';
    if (s === 'Assigned' || s === '3') return 'bg-info-soft text-info';
    return 'bg-slate-100 text-slate-500';
  }
}
