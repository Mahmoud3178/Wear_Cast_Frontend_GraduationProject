import { DriverStatus, DeliveryVehicleType } from './driver.model';

export interface ShippingDashboardStats {
  totalShipments: number;
  activeDrivers: number;
  totalRevenue: number;
  pendingDeliveries: number;
  totalShipmentsGrowth: number;
  activeDriversGrowth: number;
  totalRevenueGrowth: number;
  pendingDeliveriesGrowth: number;
  monthlyRevenue: MonthlyRevenueDto[];
  statusBreakdown: { [key: string]: number };
}

export interface MonthlyRevenueDto {
  month: string;
  revenue: number;
}

export interface DriverDashboardStats {
  pendingOrders: number;
  pickedUpOrders: number;
  assignedShipments: number;
  pickingUpShipments: number;
  outForDeliveryShipments: number;
  deliveredShipments: number;
  driverStatus: DriverStatus;
  deliveryVehicleType: DeliveryVehicleType;
}
