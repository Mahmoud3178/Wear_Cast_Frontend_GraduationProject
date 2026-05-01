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
  todayDeliveries: number;
  totalEarnings: number;
  completedDeliveries: number;
  activeHours: string;
}
