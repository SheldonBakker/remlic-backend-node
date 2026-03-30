import type { EntityType } from '../../infrastructure/database/reminders/types';

export const ENTITY_TYPES = ['firearms', 'vehicles', 'certificates', 'psira_officers', 'driver_licences'] as const satisfies readonly EntityType[];

