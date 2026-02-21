export interface ISADriversLicense {
  version: number;
  vehicleCodes: string[];
  surname: string;
  initials: string;
  professionalDrivingPermitCodes: string[] | null;
  idCountry: string;
  licenseCountry: string;
  vehicleRestrictions: string[];
  licenseNumber: string;
  idNumber: string;
  idNumberType: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  driverRestrictions: string | null;
  licenseIssueNumber: string | null;
  licenseStartDate: string | null;
  expiryDate: string | null;
  professionalDrivingPermitExpiry: string | null;
  vehicleLicenses: Array<{ code: string; restriction: string; firstIssueDate: string }> | null;
}

export interface ISAVehicleLicense {
  version: number;
  registrationNumber: string;
  vin: string | null;
  make: string | null;
  model: string | null;
  licenseDiscExpiry: string | null;
  ownerIdNumber: string | null;
  ownerName: string | null;
  engineNumber: string | null;
  color: string | null;
  vehicleType: string | null;
}
