import { Router } from 'express';
import healthRoutes from './healthRoutes';
import authRoutes from './authRoutes';
import profileRoutes from './profileRoutes';
import firearmsRoutes from './firearmsRoutes';
import psiraRoutes from './psiraRoutes';
import vehicleRoutes from './vehicleRoutes';
import certificatesRoutes from './certificatesRoutes';
import dashboardRoutes from './dashboardRoutes';
import contactRoutes from './contactRoutes';
import remindersRoutes from './remindersRoutes';
import permissionsRoutes from './permissionsRoutes';
import packagesRoutes from './packagesRoutes';
import subscriptionsRoutes from './subscriptionsRoutes';
import webhooksRoutes from './webhooksRoutes';
import driverLicenceRoutes from './driverLicenceRoutes';
import decryptRoutes from './decryptRoutes';

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
router.use('/decrypt', decryptRoutes);

export default router;
