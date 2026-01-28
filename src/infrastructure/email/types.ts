export interface IKlaviyoProfile {
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  [key: string]: unknown;
}

export interface IKlaviyoEventOptions {
  metricName: string;
  profile: IKlaviyoProfile;
  properties: Record<string, unknown>;
  uniqueId?: string;
  time?: string;
  value?: number;
}

export interface IEmailResult {
  success: boolean;
  error?: string;
}

export interface IBulkEventItem {
  email: string;
  entityType: string;
  itemName: string;
  expiryDate: string;
  daysUntilExpiry: number;
  details: Record<string, unknown>;
  uniqueId: string;
}
