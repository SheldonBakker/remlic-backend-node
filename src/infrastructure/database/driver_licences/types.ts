import type { IPagination } from '../../../shared/types/apiResponse.js';

export interface IDriverLicence {
  id: string;
  profile_id: string;
  surname: string;
  initials: string;
  id_number: string;
  expiry_date: string;
  licence_number?: string | null;
  licence_codes?: string[] | null;
  issue_date?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ICreateDriverLicenceRequest {
  surname: string;
  initials: string;
  id_number: string;
  expiry_date: string;
}

export interface ICreateDriverLicenceData extends ICreateDriverLicenceRequest {
  profile_id: string;
}

export interface IUpdateDriverLicenceRequest {
  surname?: string;
  initials?: string;
  id_number?: string;
  expiry_date?: string;
}

export interface IUpdateDriverLicenceData extends IUpdateDriverLicenceRequest {
  id: string;
  profile_id: string;
}

export interface IDriverLicenceFilters {
  surname?: string;
  id_number?: string;
  sort_by?: 'surname' | 'expiry_date' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

export interface IDriverLicenceListResponse {
  data: IDriverLicence[];
  pagination: IPagination;
}

