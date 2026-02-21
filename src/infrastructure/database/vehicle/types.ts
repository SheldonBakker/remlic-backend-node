export interface IVehicle {
  id: string;
  profile_id: string;
  make: string;
  model: string;
  year: number;
  vin_number: string | null;
  registration_number: string;
  expiry_date: string;
  created_at: string;
  updated_at: string;
}

export interface ICreateVehicleRequest {
  make: string;
  model: string;
  year: number;
  vin_number: string | null;
  registration_number: string;
  expiry_date: string;
}

export interface ICreateVehicleData extends ICreateVehicleRequest {
  profile_id: string;
}

export interface IUpdateVehicleRequest {
  make?: string;
  model?: string;
  year?: number;
  vin_number?: string | null;
  registration_number?: string;
  expiry_date?: string;
}

export interface IUpdateVehicleData extends IUpdateVehicleRequest {
  id: string;
  profile_id: string;
}

export type SortOrder = 'asc' | 'desc';
export type VehicleSortField = 'year' | 'expiry_date';

export interface IVehicleFilters {
  year?: number;
  registration_number?: string;
  sort_by?: VehicleSortField;
  sort_order?: SortOrder;
}
