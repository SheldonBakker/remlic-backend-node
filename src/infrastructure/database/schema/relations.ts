import { relations } from 'drizzle-orm';
import {
  profiles,
  firearms,
  vehicles,
  certificates,
  psiraOfficers,
  driverLicences,
  appPermissions,
  appPackages,
  appSubscriptions,
  reminderSettings,
} from './tables.js';

export const profilesRelations = relations(profiles, ({ many }) => ({
  firearms: many(firearms),
  vehicles: many(vehicles),
  certificates: many(certificates),
  psiraOfficers: many(psiraOfficers),
  driverLicences: many(driverLicences),
  appSubscriptions: many(appSubscriptions),
  reminderSettings: many(reminderSettings),
}));

export const firearmsRelations = relations(firearms, ({ one }) => ({
  profile: one(profiles, {
    fields: [firearms.profile_id],
    references: [profiles.id],
  }),
}));

export const vehiclesRelations = relations(vehicles, ({ one }) => ({
  profile: one(profiles, {
    fields: [vehicles.profile_id],
    references: [profiles.id],
  }),
}));

export const certificatesRelations = relations(certificates, ({ one }) => ({
  profile: one(profiles, {
    fields: [certificates.profile_id],
    references: [profiles.id],
  }),
}));

export const psiraOfficersRelations = relations(psiraOfficers, ({ one }) => ({
  profile: one(profiles, {
    fields: [psiraOfficers.profile_id],
    references: [profiles.id],
  }),
}));

export const driverLicencesRelations = relations(driverLicences, ({ one }) => ({
  profile: one(profiles, {
    fields: [driverLicences.profile_id],
    references: [profiles.id],
  }),
}));

export const appPermissionsRelations = relations(appPermissions, ({ many }) => ({
  appPackages: many(appPackages),
}));

export const appPackagesRelations = relations(appPackages, ({ one, many }) => ({
  appPermissions: one(appPermissions, {
    fields: [appPackages.permission_id],
    references: [appPermissions.id],
  }),
  appSubscriptions: many(appSubscriptions),
}));

export const appSubscriptionsRelations = relations(appSubscriptions, ({ one }) => ({
  profile: one(profiles, {
    fields: [appSubscriptions.profile_id],
    references: [profiles.id],
  }),
  appPackages: one(appPackages, {
    fields: [appSubscriptions.package_id],
    references: [appPackages.id],
  }),
}));

export const reminderSettingsRelations = relations(reminderSettings, ({ one }) => ({
  profile: one(profiles, {
    fields: [reminderSettings.profile_id],
    references: [profiles.id],
  }),
}));
