export interface ShippingCompany {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  commercialRegisterNumber: string;
  taxIdNumber: string;
  description: string;
  deliveryFee: number;
  address: {
    state: string;
    city: string;
    street: string;
    buildingNumber: string;
  };
  profileImageUrl?: string;
  logoUrl?: string;
  managersCount: number;
}


export interface ShippingCompanyManager {
  id: string; // usually string ID from Identity
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}

export interface CreateShippingCompanyRequest {
  managerEmail: string;
  managerFirstName: string;
  managerLastName: string;
  managerPhoneNumber: string;
  managerPassword?: string;
  managerConfirmPassword?: string;
  
  companyName: string;
  companyEmail: string;
  companyPhoneNumber: string;
  commercialRegisterNumber: string;
  taxIdNumber: string;
  description: string;
  deliveryFee: number;
  companyLogo?: File;

  companyState: string;
  companyCity: string;
  companyStreet: string;
  companyBuildingNumber: string;
}

export interface UpdateShippingCompanyRequest {
  name: string;
  email: string;
  phoneNumber: string;
  commercialRegisterNumber: string;
  taxIdNumber: string;
  description: string;
  deliveryFee: number;
  address: {
    state: string;
    city: string;
    street: string;
    buildingNumber: string;
  };
  providedCompanyId?: number;
}

export interface CreateManagerRequest {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  password?: string;
  confirmPassword?: string;
  providedShippingCompanyId?: number;
}

export interface UpdateManagerRequest {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  providedManagerId?: number;
}

export interface ShippingCompanyDashboardResponse {
  pendingOrders: number;
  pickedUpOrders: number;
  pendingShipments: number;
  unassignedShipments: number;
  assignedShipments: number;
  pickingUpShipments: number;
  outForDeliveryShipments: number;
  deliveredShipments: number;
  totalDrivers: number;
  activeDrivers: number;
  inactiveDrivers: number;
  averageDeliveryTimeInHours: number;
  numberOfManagers: number;
}

export interface WalletTransaction {
  id: number;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  referenceOrderId: number | null;
  senderName: string | null;
  senderEmail: string | null;
  createdOn: string;
}

export interface WalletResponse {
  walletId: number;
  balance: number;
  recentTransactions: WalletTransaction[];
}

