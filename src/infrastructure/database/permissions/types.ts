export interface IPermission {
  id: string;
  permission_name: string;
  psira_access: boolean;
  firearm_access: boolean;
  vehicle_access: boolean;
  certificate_access: boolean;
  drivers_access: boolean;
  created_at: string;
  updated_at: string;
}

export interface ICreatePermissionRequest {
  permission_name: string;
  psira_access?: boolean;
  firearm_access?: boolean;
  vehicle_access?: boolean;
  certificate_access?: boolean;
  drivers_access?: boolean;
}

export interface IUpdatePermissionRequest {
  permission_name?: string;
  psira_access?: boolean;
  firearm_access?: boolean;
  vehicle_access?: boolean;
  certificate_access?: boolean;
  drivers_access?: boolean;
}
