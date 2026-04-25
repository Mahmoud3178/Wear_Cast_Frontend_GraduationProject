export enum DriverStatus {
  Available = 0,
  Busy = 1,
  Offline = 2
}

export enum DeliveryVehicleType {
  Car = 0,
  Motorcycle = 1,
  Bicycle = 2,
  Van = 3,
  Truck = 4
}

export interface Driver {
  id: number;
  driverName: string;
  vehicleType: DeliveryVehicleType;
  status: DriverStatus;
  driverCity: string;
  isDeleted: boolean;
  numberOfAssignedShipments: number;
  numberOfActiveShipments: number;
  numberOfDeliveredShipments: number;
}

export interface DriverProfile {
  id: number;
  driverName: string;
  vehicleType: DeliveryVehicleType;
  status: DriverStatus;
  driverCity: string;
  phoneNumber?: string;
  profileImageUrl?: string;
  nationalId?: string;
  email?: string;
}

export interface CreateDriverRequest {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  password?: string;
  confirmPassword?: string;
  profileImage?: File;
  nationalId: string;
  vehicleType: DeliveryVehicleType;
  vehiclePlateNumber?: string;
  state: string;
  city: string;
  street: string;
  buildingNumber: string;
  providedShippingCompanyId?: number;
}

export interface AddressDto {
  state: string;
  city: string;
  street: string;
  buildingNumber: string;
}

export interface UpdateDriverRequest {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  nationalId: string;
  vehicleType: DeliveryVehicleType;
  vehiclePlateNumber?: string;
  address: AddressDto;
  providedDriverId?: number;
}

export interface UpdateDriverStatusRequest {
  driverId: number;
  newStatus: DriverStatus;
}
