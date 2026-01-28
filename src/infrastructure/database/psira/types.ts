export interface IPsiraApiRequest {
  ApplicationNo: string;
  ContactNo: string | null;
  IDNumber: string;
  SIRANo: string;
  CompanyName: string;
  ProfileId: string;
}

export interface IPsiraApiResponseItem {
  FirstName: string;
  LastName: string;
  Gender: string;
  RequestStatus: string;
  ProfileId: number;
  SIRANo: string;
  RegistrationDate: string;
  ProfileImage: string;
  IsAzureStorage: number;
  ExpiryDate: string;
  Grade: string;
  EmpStatus: string;
  EmpCompany: string;
  CertificateStatus: string;
  SpecialGrade: string;
}

export interface IPsiraApiResponse {
  Table: IPsiraApiResponseItem[];
  Table1: unknown[];
}

export interface IPsiraResult {
  FirstName: string;
  LastName: string;
  Gender: string;
  RequestStatus: string;
  SIRANo: string;
  ExpiryDate: string;
}

export interface IPsiraOfficer {
  id: string;
  profile_id: string;
  id_number: string;
  first_name: string;
  last_name: string;
  gender: string;
  request_status: string;
  sira_no: string;
  expiry_date: string;
  created_at: string;
  updated_at: string;
}

export interface ICreatePsiraOfficerRequest {
  IDNumber: string;
  FirstName: string;
  LastName: string;
  Gender: string;
  RequestStatus: string;
  SIRANo: string;
  ExpiryDate: string;
}

export type SortOrder = 'asc' | 'desc';

export interface IPsiraFilters {
  id_number?: string;
  sort_by?: 'expiry_date';
  sort_order?: SortOrder;
}
