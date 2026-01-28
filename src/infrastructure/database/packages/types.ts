import type { IPermission } from '../permissions/types.js';

export type PackageType = 'monthly' | 'yearly';

export interface IPackage {
  id: string;
  package_name: string;
  slug: string;
  type: PackageType;
  permission_id: string;
  description: string | null;
  is_active: boolean;
  paystack_plan_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface IPackageWithPermission extends IPackage {
  app_permissions: IPermission;
}

export interface ICreatePackageRequest {
  package_name: string;
  slug: string;
  type: PackageType;
  permission_id: string;
  description?: string;
}

export interface IUpdatePackageRequest {
  package_name?: string;
  slug?: string;
  type?: PackageType;
  permission_id?: string;
  description?: string | null;
  is_active?: boolean;
}

export interface IPackagesFilters {
  is_active?: boolean;
  type?: PackageType;
}
