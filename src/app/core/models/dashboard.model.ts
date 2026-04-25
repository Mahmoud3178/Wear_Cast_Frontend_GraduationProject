export interface ShippingDashboardStats {
  totalShipments: number;
  activeDrivers: number;
  totalRevenue: number;
  pendingDeliveries: number;
}

export interface DriverDashboardStats {
  todayDeliveries: number;
  totalEarnings: number;
  completedDeliveries: number;
  activeHours: string;
}
