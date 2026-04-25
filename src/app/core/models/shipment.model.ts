export enum ShipmentStatus {
  Pending = 0,
  ReadyForPickup = 1,
  InTransit = 2,
  Delivered = 3,
  Cancelled = 4
}

export interface Address {
  state: string;
  city: string;
  street: string;
  postalCode?: string;
}

export interface OrderSummary {
  orderId: number;
  storeName: string;
  itemsCount: number;
}

export interface Shipment {
  id: number;
  isDeleted: boolean;
  orderTime: string;
  shipmentStatus: ShipmentStatus;
  price: number;
  numberOfOrders: number;
  deliveryState: string;
  deliveryCity: string;
  deliveryStreet: string;
  deliveryCode: string;
  driverName?: string;
  customerName: string;
}

export interface ShipmentDetails {
  id: number;
  isDeleted: boolean;
  deliveryAddress: Address;
  price: number;
  shipmentStatus: ShipmentStatus;
  orderTime: string;
  readyForPickupAt?: string;
  tripStartedAt?: string;
  outForDeliveryAt?: string;
  deliveredAt?: string;
  deliveryCode: string;
  driverId?: number;
  driverName?: string;
  driverPhoneNumber?: string;
  driverNationalId?: string;
  customerId: number;
  customerName: string;
  customerPhoneNumber: string;
  orders: OrderSummary[];
}

export interface AssignShipmentRequest {
  shipmentId: number;
  driverId: number;
  assignerId?: string;
}

export interface DriverShipment {
  id: number;
  orderTime: string;
  shipmentStatus: ShipmentStatus;
  customerName: string;
  customerPhoneNumber: string;
  numberOfOrders: number;
  deliveryCity: string;
  deliveryStreet: string;
}

export interface DriverShipmentDetails {
  id: number;
  deliveryAddress: Address;
  shipmentStatus: ShipmentStatus;
  orderedAt: string;
  readyForPickupAt?: string;
  tripStartedAt?: string;
  outForDeliveryAt?: string;
  deliveredAt?: string;
  customerName: string;
  customerPhoneNumber: string;
  orders: OrderSummary[];
}

export interface UpdateShipmentStatusRequest {
  shipmentId: number;
  newStatus: ShipmentStatus;
  deliveryCode?: string;
}
