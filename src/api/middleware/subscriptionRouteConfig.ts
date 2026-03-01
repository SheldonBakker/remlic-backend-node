export type SubscriptionFeature = 'psira_access' | 'firearm_access' | 'vehicle_access' | 'certificate_access' | 'drivers_access';

export interface IRouteSubscriptionConfig {
  feature: SubscriptionFeature;
}

export const SUBSCRIPTION_ROUTE_CONFIG: Record<string, IRouteSubscriptionConfig> = {
  '/firearms': { feature: 'firearm_access' },
  '/vehicle': { feature: 'vehicle_access' },
  '/certificates': { feature: 'certificate_access' },
  '/psira': { feature: 'psira_access' },
  '/driver-licences': { feature: 'drivers_access' },
  '/decrypt': { feature: 'drivers_access' },
};

export const getRouteFeature = (basePath: string): SubscriptionFeature | null => {
  const config = (SUBSCRIPTION_ROUTE_CONFIG as Record<string, IRouteSubscriptionConfig | undefined>)[basePath];
  return config?.feature ?? null;
};
