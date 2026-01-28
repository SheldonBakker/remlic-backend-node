import type { EntityType } from '../../infrastructure/database/reminders/types.js';
import type { SubscriptionFeature } from '../../api/middleware/subscriptionRouteConfig.js';

export const ENTITY_TYPES: EntityType[] = ['firearms', 'vehicles', 'certificates', 'psira_officers', 'driver_licences'];

export const ENTITY_TABLE_MAP: Record<EntityType, string> = {
  firearms: 'firearms',
  vehicles: 'vehicles',
  certificates: 'certificates',
  psira_officers: 'psira_officers',
  driver_licences: 'driver_licences',
};

export const ENTITY_TO_PERMISSION: Record<EntityType, SubscriptionFeature> = {
  firearms: 'firearm_access',
  vehicles: 'vehicle_access',
  certificates: 'certificate_access',
  psira_officers: 'psira_access',
  driver_licences: 'drivers_access',
};

export const ENTITY_DISPLAY_NAMES: Record<EntityType, string> = {
  firearms: 'Firearms',
  vehicles: 'Vehicles',
  certificates: 'Certificates',
  psira_officers: 'PSIRA Officers',
  driver_licences: 'Driver Licences',
};
