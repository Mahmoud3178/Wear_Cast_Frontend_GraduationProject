import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ShippingService } from '../../../../core/services/shipping.service';
import { DriverService } from '../../../../core/services/driver.service';
import { ShipmentDetails, ShipmentStatus } from '../../../../core/models/shipment.model';
import { Driver, DriverStatus, DeliveryVehicleType } from '../../../../core/models/driver.model';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-shipping-shipment-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './shipment-details.component.html',
  styleUrl: './shipment-details.component.css'
})
export class ShippingShipmentDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private shippingService = inject(ShippingService);
  private driverService = inject(DriverService);

  shipmentId!: number;
  selectedShipmentDetails: any | null = null;
  isLoadingDetails = false;
  errorMessage = '';

  drivers: any[] = [];
  availableDrivers: any[] = [];
  selectedDriverId: number | null = null;
  isAssigningDriver = false;
  
  selectedShipmentFixedItems: any[] = [];
  selectedShipmentDesignedItems: any[] = [];

  ShipmentStatusEnum = ShipmentStatus;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.shipmentId = +idParam;
      this.loadShipmentDetails();
      this.loadDrivers();
    }
  }

  loadShipmentDetails() {
    this.isLoadingDetails = true;
    this.errorMessage = '';

    this.shippingService.getShipmentById(this.shipmentId).subscribe({
      next: (shipment) => {
        this.selectedShipmentDetails = shipment;
        
        // Fetch order items for items list
        this.shippingService.getShipmentOrderItems(this.shipmentId).subscribe({
          next: (res) => {
            const fixedList = res?.fixedItems?.items || res?.FixedItems?.Items || res?.fixedItems?.Items || res?.FixedItems?.items || [];
            const designedList = res?.designedItems?.items || res?.DesignedItems?.Items || res?.designedItems?.Items || res?.DesignedItems?.items || [];
            
            this.selectedShipmentFixedItems = fixedList.map((item: any) => ({
              ...item,
              imageUrl: this.resolveImageUrl(item.imageUrl)
            }));
            this.selectedShipmentDesignedItems = designedList.map((item: any) => ({
              ...item,
              frontImageUrl: this.resolveImageUrl(item.frontImageUrl),
              backImageUrl: item.backImageUrl ? this.resolveImageUrl(item.backImageUrl) : null,
              leftImageUrl: item.leftImageUrl ? this.resolveImageUrl(item.leftImageUrl) : null,
              rightImageUrl: item.rightImageUrl ? this.resolveImageUrl(item.rightImageUrl) : null
            }));
            this.isLoadingDetails = false;
          },
          error: (err) => {
            console.error('Failed to load shipment items', err);
            this.isLoadingDetails = false;
          }
        });

        // Initialize orders status inside shipment details
        if (this.selectedShipmentDetails && !this.selectedShipmentDetails.orders) {
          this.selectedShipmentDetails.orders = [];
        }

        // Fetch individual orders to populate details reactively from backend
        this.shippingService.getOrdersByShipmentId(this.shipmentId).subscribe({
          next: (orders) => {
            let ordersArray: any[] = [];
            if (orders) {
              if (Array.isArray(orders)) {
                ordersArray = orders;
              } else if (Array.isArray(orders.orders)) {
                ordersArray = orders.orders;
              } else if (Array.isArray(orders.Orders)) {
                ordersArray = orders.Orders;
              } else if (Array.isArray(orders.items)) {
                ordersArray = orders.items;
              }

              // Merge all other shipment properties from getOrdersByShipmentId to ensure consistency!
              this.selectedShipmentDetails = {
                ...this.selectedShipmentDetails,
                ...orders,
                orders: ordersArray.map((o: any) => {
                  const isFixed = o.orderType === 0 || o.orderType === 'Fixed' || o.orderType === 'Standard Store' || o.orderType === 'StandardStore';
                  
                  // Ensure correct string status
                  let statusStr = 'Pending';
                  if (o.status !== undefined && o.status !== null) {
                    const s = o.status.toString();
                    if (s === '0' || s === 'Pending') statusStr = 'Pending';
                    else if (s === '1' || s === 'Paid') statusStr = 'Paid';
                    else if (s === '2' || s === 'Failed') statusStr = 'Failed';
                    else if (s === '3' || s === 'Cancelled') statusStr = 'Cancelled';
                    else if (s === '4' || s === 'Refunded') statusStr = 'Refunded';
                    else if (s === '5' || s === 'Ready') statusStr = 'Ready';
                    else if (s === '6' || s === 'PickedUp') statusStr = 'PickedUp';
                  }

                  return {
                    id: o.id,
                    orderType: isFixed ? 'Standard Store' : 'Custom Tailored',
                    vendorName: o.vendorName || (isFixed ? 'WearCast Store' : 'Design Factory'),
                    totalAmount: o.totalAmount,
                    status: statusStr,
                    recipientName: o.recipientName,
                    recipientPhoneNumber: o.recipientPhoneNumber,
                    shippingAddress: o.shippingAddress || { street: 'N/A', city: 'N/A', state: 'N/A' }
                  };
                })
              };
            }
          },
          error: (err) => console.error('Failed to load nested orders', err)
        });
      },
      error: (err) => {
        console.error('Failed to load shipment details', err);
        this.errorMessage = 'Failed to load shipment details.';
        this.isLoadingDetails = false;
        this.loadMockData();
      }
    });
  }

  loadMockData() {
    this.selectedShipmentDetails = {
      id: this.shipmentId,
      deliveryAddress: {
        state: 'Gaza State',
        city: 'Gaza City',
        street: 'Al-Wehda Street',
        postalCode: '99000'
      },
      shipmentStatus: ShipmentStatus.OutForDelivery,
      orderTime: new Date().toISOString(),
      customerName: 'Ahmed Ali',
      customerPhoneNumber: '+970599112233',
      customerId: '1092',
      price: 95.00,
      deliveryCode: 'WC-9831',
      driverName: 'Mohammad Naser',
      driverNationalId: '409182391',
      driverPhoneNumber: '+970598887766',
      orders: [
        { 
          id: 201, 
          orderType: 'Standard Store', 
          vendorName: 'WearCast Palestine Store', 
          totalAmount: 60.00, 
          status: 'Ready',
          recipientName: 'Ahmed Ali',
          recipientPhoneNumber: '+970599112233',
          shippingAddress: { street: 'Al-Wehda Street', city: 'Gaza City', state: 'Gaza State' }
        },
        { 
          id: 202, 
          orderType: 'Custom Tailored', 
          vendorName: 'Google Merch Gaza Store', 
          totalAmount: 35.00, 
          status: 'Ready',
          recipientName: 'Ahmed Ali',
          recipientPhoneNumber: '+970599112233',
          shippingAddress: { street: 'Al-Wehda Street', city: 'Gaza City', state: 'Gaza State' }
        }
      ]
    };

    this.selectedShipmentFixedItems = [
      {
        productName: 'Premium Casual T-Shirt',
        totalQuantity: 2,
        unitPrice: 15.00,
        totalPrice: 30.00,
        colorName: 'Indigo Blue',
        imageUrl: null,
        sizes: [{ sizeName: 'M', quantity: 2 }]
      },
      {
        productName: 'Signature Denim Jacket',
        totalQuantity: 1,
        unitPrice: 30.00,
        totalPrice: 30.00,
        colorName: 'Charcoal Black',
        imageUrl: null,
        sizes: [{ sizeName: 'L', quantity: 1 }]
      }
    ];

    this.selectedShipmentDesignedItems = [
      {
        productName: 'Custom Designed Hoodie',
        totalQuantity: 1,
        unitPrice: 35.00,
        totalPrice: 35.00,
        colorName: 'Teal Green',
        frontImageUrl: null,
        sizes: [{ sizeName: 'XL', quantity: 1 }]
      }
    ];
  }

  getNumericStatus(status: any, enumObj: any): number {
    if (status === null || status === undefined) return -1;
    if (typeof status === 'number') return status;
    if (typeof status === 'string') {
      if (!isNaN(Number(status))) return Number(status);
      return enumObj[status as keyof typeof enumObj] as unknown as number;
    }
    return -1;
  }

  isStepActive(currentStatus: any, step: number): boolean {
    const s = this.getNumericStatus(currentStatus, ShipmentStatus);
    if (step === 0) return true; // Order Placed is always active
    if (step === 2) return s >= 3; // Driver Assigned (Assigned status is 3)
    if (step === 4) return s >= 4; // In Transit (PickingUp / OutForDelivery)
    if (step === 5) return s === 6; // Delivered
    return false;
  }

  getStatusBadgeClass(status: any): string {
    const s = this.getNumericStatus(status, ShipmentStatus);
    switch (s) {
      case ShipmentStatus.Pending:
      case ShipmentStatus.Unassigned:
        return 'status-danger';
      case ShipmentStatus.Assigned:
        return 'status-warning';
      case ShipmentStatus.PickingUp:
      case ShipmentStatus.OutForDelivery:
        return 'status-info';
      case ShipmentStatus.Delivered:
        return 'status-success';
      default:
        return 'status-info';
    }
  }

  getStatusName(status: any): string {
    const s = this.getNumericStatus(status, ShipmentStatus);
    switch (s) {
      case ShipmentStatus.Pending: return 'Pending';
      case ShipmentStatus.Unassigned: return 'Unassigned';
      case ShipmentStatus.Assigned: return 'Assigned';
      case ShipmentStatus.PickingUp: return 'Picking Up';
      case ShipmentStatus.OutForDelivery: return 'Out for Delivery';
      case ShipmentStatus.Delivered: return 'Delivered';
      default: return 'In Progress';
    }
  }

  loadDrivers() {
    this.driverService.getAllDrivers().subscribe({
      next: (data) => {
        const drivers = data.items || [];
        this.drivers = drivers;
        // Filter only available drivers (status code 1 represents Available)
        this.availableDrivers = drivers.filter((d: any) => {
          if (d.status === undefined || d.status === null) return true;
          const statusNum = this.getNumericStatus(d.status, DriverStatus);
          return statusNum === DriverStatus.Available || d.status === 'Available';
        });
      },
      error: (err) => console.error('Failed to load drivers in details', err)
    });
  }

  getVehicleTypeName(type: any): string {
    const t = this.getNumericStatus(type, DeliveryVehicleType);
    switch (t) {
      case DeliveryVehicleType.Bicycle: return 'Bicycle';
      case DeliveryVehicleType.Motorcycle: return 'Motorcycle';
      case DeliveryVehicleType.Car: return 'Car';
      case DeliveryVehicleType.Van: return 'Van';
      default: return 'Vehicle';
    }
  }

  assignDriver() {
    if (!this.selectedDriverId || !this.selectedShipmentDetails) return;
    this.isAssigningDriver = true;
    this.errorMessage = '';
    
    this.shippingService.assignDriver({
      shipmentId: this.shipmentId,
      driverId: Number(this.selectedDriverId)
    }).subscribe({
      next: () => {
        this.isAssigningDriver = false;
        this.selectedDriverId = null;
        this.loadShipmentDetails();
        this.loadDrivers();
      },
      error: (err) => {
        console.error('Failed to assign driver', err);
        this.isAssigningDriver = false;
        this.errorMessage = err.error?.message || 'Failed to assign driver. Please check driver availability or backend status constraints.';
      }
    });
  }

  resolveImageUrl(raw: string | null | undefined): string {
    if (!raw) return 'assets/placeholder.png';
    const u = raw.trim();
    if (!u) return 'assets/placeholder.png';
    if (u.startsWith('data:')) return u;
    if (/^https?:\/\//i.test(u)) {
      return u;
    }
    if (u.startsWith('//')) {
      return `${typeof window !== 'undefined' ? window.location.protocol : 'https:'}${u}`;
    }
    const base = environment.apiUrl.replace(/\/$/, '');
    const path = u.startsWith('/') ? u : `/${u}`;
    return base ? `${base}${path}` : path;
  }
}
