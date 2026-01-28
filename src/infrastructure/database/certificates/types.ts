export interface ICertificate {
  id: string;
  profile_id: string;
  type: string;
  first_name: string;
  last_name: string;
  certificate_number: string;
  expiry_date: string;
  created_at: string;
  updated_at: string;
}

export interface ICreateCertificateRequest {
  type: string;
  first_name: string;
  last_name: string;
  certificate_number: string;
  expiry_date: string;
}

export interface ICreateCertificateData extends ICreateCertificateRequest {
  profile_id: string;
}

export interface IUpdateCertificateRequest {
  type?: string;
  first_name?: string;
  last_name?: string;
  certificate_number?: string;
  expiry_date?: string;
}

export interface IUpdateCertificateData extends IUpdateCertificateRequest {
  id: string;
  profile_id: string;
}

export type SortOrder = 'asc' | 'desc';

export interface ICertificatesFilters {
  certificate_number?: string;
  sort_by?: 'expiry_date';
  sort_order?: SortOrder;
}
