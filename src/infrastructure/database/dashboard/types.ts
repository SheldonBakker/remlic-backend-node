export type RecordType = 'firearms' | 'vehicles' | 'psira_officers' | 'certificates';

export type SortOrder = 'asc' | 'desc';

export interface IDashboardExpiringRecord {
  id: string;
  record_type: RecordType;
  name: string;
  identifier: string;
  expiry_date: string;
  created_at: string;
}

export interface IDashboardFilters {
  record_type?: RecordType;
  sort_order?: SortOrder;
  days_ahead: number;
  include_expired: boolean;
}

export interface IFirearmRow {
  id: string;
  type: string;
  make: string;
  model: string;
  serial_number: string | null;
  expiry_date: string;
  created_at: string;
}

export interface IVehicleRow {
  id: string;
  make: string;
  model: string;
  year: number;
  registration_number: string;
  expiry_date: string;
  created_at: string;
}

export interface IPsiraOfficerRow {
  id: string;
  first_name: string;
  last_name: string;
  sira_no: string;
  expiry_date: string;
  created_at: string;
}

export interface ICertificateRow {
  id: string;
  type: string;
  first_name: string;
  last_name: string;
  certificate_number: string;
  expiry_date: string;
  created_at: string;
}

export interface IExpiringRecordRaw {
  id: string;
  record_type: RecordType;
  name: string;
  identifier: string;
  expiry_date: string;
  created_at: string;
}
