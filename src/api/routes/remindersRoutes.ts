import { Router } from 'express';
import { list, bulkUpdate, update, remove } from '../controllers/remindersController.js';
import { requireRole, UserRole } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireRole(UserRole.USER));

/**
 * @swagger
 * components:
 *   schemas:
 *     ReminderSetting:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         profile_id:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         entity_type:
 *           type: string
 *           enum: [firearms, vehicles, certificates, psira_officers]
 *           example: "firearms"
 *         reminder_days:
 *           type: array
 *           items:
 *             type: integer
 *             minimum: 1
 *             maximum: 365
 *           example: [30, 14, 7]
 *         is_enabled:
 *           type: boolean
 *           example: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     ReminderSettingsResponse:
 *       type: object
 *       properties:
 *         firearms:
 *           $ref: '#/components/schemas/ReminderSetting'
 *           nullable: true
 *         vehicles:
 *           $ref: '#/components/schemas/ReminderSetting'
 *           nullable: true
 *         certificates:
 *           $ref: '#/components/schemas/ReminderSetting'
 *           nullable: true
 *         psira_officers:
 *           $ref: '#/components/schemas/ReminderSetting'
 *           nullable: true
 *     UpdateReminderSettingRequest:
 *       type: object
 *       minProperties: 1
 *       properties:
 *         reminder_days:
 *           type: array
 *           items:
 *             type: integer
 *             minimum: 1
 *             maximum: 365
 *           minItems: 1
 *           maxItems: 10
 *           example: [30, 14, 7]
 *         is_enabled:
 *           type: boolean
 *           example: true
 *     BulkUpdateReminderSettingsRequest:
 *       type: object
 *       required:
 *         - settings
 *       properties:
 *         settings:
 *           type: array
 *           minItems: 1
 *           maxItems: 4
 *           items:
 *             type: object
 *             required:
 *               - entity_type
 *               - reminder_days
 *               - is_enabled
 *             properties:
 *               entity_type:
 *                 type: string
 *                 enum: [firearms, vehicles, certificates, psira_officers]
 *               reminder_days:
 *                 type: array
 *                 items:
 *                   type: integer
 *                   minimum: 1
 *                   maximum: 365
 *                 minItems: 1
 *                 maxItems: 10
 *               is_enabled:
 *                 type: boolean
 */

/**
 * @swagger
 * /settings/reminders:
 *   get:
 *     summary: Get all reminder settings for the authenticated user
 *     description: Returns reminder settings for all entity types (firearms, vehicles, certificates, psira_officers).
 *     tags:
 *       - Reminder Settings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reminder settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     settings:
 *                       $ref: '#/components/schemas/ReminderSettingsResponse'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', list);

/**
 * @swagger
 * /settings/reminders:
 *   put:
 *     summary: Bulk update reminder settings
 *     description: Updates multiple reminder settings at once. Each entity type can only appear once.
 *     tags:
 *       - Reminder Settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkUpdateReminderSettingsRequest'
 *     responses:
 *       200:
 *         description: Reminder settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     settings:
 *                       $ref: '#/components/schemas/ReminderSettingsResponse'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *       400:
 *         description: Bad request - Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/', bulkUpdate);

/**
 * @swagger
 * /settings/reminders/{entityType}:
 *   patch:
 *     summary: Update a single reminder setting
 *     description: Updates the reminder setting for a specific entity type. At least one field must be provided.
 *     tags:
 *       - Reminder Settings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [firearms, vehicles, certificates, psira_officers]
 *         description: The entity type to update settings for
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateReminderSettingRequest'
 *     responses:
 *       200:
 *         description: Reminder setting updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     setting:
 *                       $ref: '#/components/schemas/ReminderSetting'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *       400:
 *         description: Bad request - Invalid input data or entity type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:entityType', update);

/**
 * @swagger
 * /settings/reminders/{entityType}:
 *   delete:
 *     summary: Delete a reminder setting
 *     description: Deletes the reminder setting for a specific entity type.
 *     tags:
 *       - Reminder Settings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [firearms, vehicles, certificates, psira_officers]
 *         description: The entity type to delete settings for
 *     responses:
 *       200:
 *         description: Reminder setting deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Reminder setting deleted successfully"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *       400:
 *         description: Bad request - Invalid entity type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Reminder setting not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:entityType', remove);

export default router;
