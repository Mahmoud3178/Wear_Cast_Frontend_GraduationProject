export interface MonthlyRevenue {
  month: string;
  revenue: number;
}

export interface ShippingStats {
  totalShipments: number;
  activeDrivers: number;
  totalRevenue: number;
  pendingDeliveries: number;
  totalShipmentsGrowth: number;
  activeDriversGrowth: number;
  totalRevenueGrowth: number;
  pendingDeliveriesGrowth: number;
  monthlyRevenue: MonthlyRevenue[];
  statusBreakdown: { [key: string]: number };
}
