import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import profileRoutes from './profileRoutes.js';
import firearmsRoutes from './firearmsRoutes.js';
import psiraRoutes from './psiraRoutes.js';
import vehicleRoutes from './vehicleRoutes.js';
import certificatesRoutes from './certificatesRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import contactRoutes from './contactRoutes.js';
import remindersRoutes from './remindersRoutes.js';
import permissionsRoutes from './permissionsRoutes.js';
import packagesRoutes from './packagesRoutes.js';
import subscriptionsRoutes from './subscriptionsRoutes.js';
import webhooksRoutes from './webhooksRoutes.js';
import driverLicenceRoutes from './driverLicenceRoutes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/firearms', firearmsRoutes);
router.use('/psira', psiraRoutes);
router.use('/vehicle', vehicleRoutes);
router.use('/certificates', certificatesRoutes);
router.use('/driver-licences', driverLicenceRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/contact', contactRoutes);
router.use('/settings/reminders', remindersRoutes);
router.use('/permissions', permissionsRoutes);
router.use('/packages', packagesRoutes);
router.use('/subscriptions', subscriptionsRoutes);
router.use('/webhooks', webhooksRoutes);

export default router;
