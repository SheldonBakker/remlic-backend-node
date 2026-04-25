type RecordType = 'firearms' | 'vehicles' | 'psira_officers' | 'certificates';

type SortOrder = 'asc' | 'desc';

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

