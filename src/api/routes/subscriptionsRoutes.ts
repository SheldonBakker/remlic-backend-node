import { Router } from 'express';
import {
  updateSubscriptionHandler,
  cancelSubscriptionHandler,
  getMySubscriptions,
  subscriptionActionHandler,
} from '../controllers/subscriptionsController.js';
import { requireRole, UserRole } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Subscription:
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
 *         package_id:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         start_date:
 *           type: string
 *           format: date
 *           example: "2024-01-01"
 *         end_date:
 *           type: string
 *           format: date
 *           example: "2024-12-31"
 *         status:
 *           type: string
 *           enum: [active, expired, cancelled, refunded]
 *           example: "active"
 *         paystack_transaction_reference:
 *           type: string
 *           nullable: true
 *           example: "sub_abc123_def456"
 *         paystack_subscription_code:
 *           type: string
 *           nullable: true
 *           example: "SUB_abc123"
 *         paystack_customer_code:
 *           type: string
 *           nullable: true
 *           example: "CUS_abc123"
 *         paystack_email_token:
 *           type: string
 *           nullable: true
 *           example: "token_abc123"
 *         current_period_end:
 *           type: string
 *           format: date
 *           nullable: true
 *           example: "2024-12-31"
 *         refunded_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     SubscriptionWithPackage:
 *       allOf:
 *         - $ref: '#/components/schemas/Subscription'
 *         - type: object
 *           properties:
 *             app_packages:
 *               $ref: '#/components/schemas/PackageWithPermission'
 *     CreateSubscriptionRequest:
 *       type: object
 *       required:
 *         - profile_id
 *         - package_id
 *         - start_date
 *         - end_date
 *       properties:
 *         profile_id:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         package_id:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         start_date:
 *           type: string
 *           format: date
 *           example: "2024-01-01"
 *         end_date:
 *           type: string
 *           format: date
 *           example: "2024-12-31"
 *     UpdateSubscriptionRequest:
 *       type: object
 *       minProperties: 1
 *       properties:
 *         package_id:
 *           type: string
 *           format: uuid
 *         start_date:
 *           type: string
 *           format: date
 *         end_date:
 *           type: string
 *           format: date
 *         status:
 *           type: string
 *           enum: [active, expired, cancelled, refunded]
 *     UserPermissions:
 *       type: object
 *       properties:
 *         psira_access:
 *           type: boolean
 *           example: true
 *         firearm_access:
 *           type: boolean
 *           example: false
 *         vehicle_access:
 *           type: boolean
 *           example: true
 *         certificate_access:
 *           type: boolean
 *           example: false
 *         drivers_access:
 *           type: boolean
 *           example: true
 *         active_subscriptions:
 *           type: integer
 *           example: 2
 *     InitializeSubscriptionResponse:
 *       type: object
 *       properties:
 *         authorization_url:
 *           type: string
 *           format: uri
 *           example: "https://checkout.paystack.com/abc123"
 *         reference:
 *           type: string
 *           example: "ref_abc123"
 *         access_code:
 *           type: string
 *           example: "access_abc123"
 *     SubscriptionMessageResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Subscription cancelled successfully"
 */

/**
 * @swagger
 * /subscriptions:
 *   get:
 *     summary: Get subscriptions (role-scoped)
 *     description: Paginated list of subscriptions filtered by status. Admins see all users; regular users see only their own.
 *     tags:
 *       - Subscriptions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, expired, cancelled, refunded]
 *         description: "Filter by subscription status (default: active)"
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Base64-encoded cursor for pagination. Omit for first page.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items to return per page (default 20, max 100)
 *     responses:
 *       200:
 *         description: User subscriptions retrieved successfully
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
 *                     subscriptions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SubscriptionWithPackage'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     nextCursor:
 *                       type: string
 *                       nullable: true
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *       401:
 *         description: Unauthorized - Invalid or missing token
 */
router.get('/', requireRole(UserRole.USER, UserRole.ADMIN), getMySubscriptions);

/**
 * @swagger
 * /subscriptions:
 *   post:
 *     summary: Perform a subscription action
 *     description: |
 *       Dispatches a subscription action based on the `action` query parameter.
 *       - `initialize`: Start a Paystack payment session (body: `package_id`, `callback_url`)
 *       - `cancel`: Cancel a subscription. Admins bypass ownership checks. (query: `id`)
 *       - `refund`: Refund a subscription. (query: `id`)
 *       - `change-plan`: Change subscription plan. (query: `id`, body: `new_package_id`, `callback_url`)
 *     tags:
 *       - Subscriptions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: action
 *         required: true
 *         schema:
 *           type: string
 *           enum: [initialize, cancel, refund, change-plan]
 *         description: The action to perform
 *       - in: query
 *         name: id
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The subscription ID (required for cancel, refund, change-plan)
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               package_id:
 *                 type: string
 *                 format: uuid
 *                 description: Required for initialize
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               new_package_id:
 *                 type: string
 *                 format: uuid
 *                 description: Required for change-plan
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               callback_url:
 *                 type: string
 *                 format: uri
 *                 description: Required for initialize and change-plan
 *                 example: "https://example.com/payment/callback"
 *     responses:
 *       200:
 *         description: Action performed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/InitializeSubscriptionResponse'
 *                     - $ref: '#/components/schemas/SubscriptionMessageResponse'
 *                   description: |
 *                     Shape depends on action:
 *                     - `initialize` / `change-plan`: `InitializeSubscriptionResponse` (authorization_url, reference, access_code)
 *                     - `cancel` / `refund`: `SubscriptionMessageResponse` (message)
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *       400:
 *         description: Bad request - Invalid action or input data
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Not the subscription owner
 *       404:
 *         description: Subscription not found
 *       502:
 *         description: Bad gateway - Failed to process with payment provider
 */
router.post('/', requireRole(UserRole.USER, UserRole.ADMIN), subscriptionActionHandler);

/**
 * @swagger
 * /subscriptions/{id}:
 *   patch:
 *     summary: Update a subscription (Admin only)
 *     description: Updates a subscription by its ID. At least one field must be provided.
 *     tags:
 *       - Subscriptions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The subscription ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSubscriptionRequest'
 *     responses:
 *       200:
 *         description: Subscription updated successfully
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
 *                     subscription:
 *                       $ref: '#/components/schemas/Subscription'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *       400:
 *         description: Bad request - Invalid input data
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Subscription not found
 */
router.patch('/:id', requireRole(UserRole.ADMIN), updateSubscriptionHandler);

/**
 * @swagger
 * /subscriptions/{id}:
 *   delete:
 *     summary: Cancel a subscription (Admin only)
 *     description: Cancels a subscription by setting its status to 'cancelled'.
 *     tags:
 *       - Subscriptions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The subscription ID
 *     responses:
 *       200:
 *         description: Subscription cancelled successfully
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
 *                       example: "Subscription cancelled successfully"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Subscription not found
 */
router.delete('/:id', requireRole(UserRole.ADMIN), cancelSubscriptionHandler);

export default router;
