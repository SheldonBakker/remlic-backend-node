export interface IFirearm {
  id: string;
  profile_id: string;
  type: string;
  make: string;
  model: string;
  caliber: string;
  serial_number: string | null;
  expiry_date: string;
  created_at: string;
  updated_at: string;
}

export interface ICreateFirearmRequest {
  type: string;
  make: string;
  model: string;
  caliber: string;
  serial_number: string | null;
  expiry_date: string;
}

export interface ICreateFirearmData extends ICreateFirearmRequest {
  profile_id: string;
}

export interface IUpdateFirearmRequest {
  type?: string;
  make?: string;
  model?: string;
  caliber?: string;
  serial_number?: string | null;
  expiry_date?: string;
}

export interface IUpdateFirearmData extends IUpdateFirearmRequest {
  id: string;
  profile_id: string;
}

export type SortOrder = 'asc' | 'desc';

export interface IFirearmsFilters {
  serial_number?: string;
  sort_by?: 'expiry_date';
  sort_order?: SortOrder;
}
