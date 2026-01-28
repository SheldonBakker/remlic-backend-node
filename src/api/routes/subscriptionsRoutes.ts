import { Router } from 'express';
import SubscriptionsController from '../controllers/subscriptionsController.js';
import { requestHandler } from '../middleware/requestHandler.js';
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
 *         active_subscriptions:
 *           type: integer
 *           example: 2
 */

/**
 * @swagger
 * /subscriptions/me:
 *   get:
 *     summary: Get current user's subscriptions
 *     description: Returns a paginated list of the authenticated user's subscriptions.
 *     tags:
 *       - Subscriptions
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *                       type: object
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
router.get('/me', requireRole(UserRole.USER, UserRole.ADMIN), requestHandler(SubscriptionsController.getMySubscriptions));

/**
 * @swagger
 * /subscriptions/me/permissions:
 *   get:
 *     summary: Get current user's aggregated permissions
 *     description: Returns the aggregated permissions from all active subscriptions for the authenticated user.
 *     tags:
 *       - Subscriptions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User permissions retrieved successfully
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
 *                     permissions:
 *                       $ref: '#/components/schemas/UserPermissions'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *       401:
 *         description: Unauthorized - Invalid or missing token
 */
router.get('/me/permissions', requireRole(UserRole.USER, UserRole.ADMIN), requestHandler(SubscriptionsController.getMyPermissions));

/**
 * @swagger
 * /subscriptions/me/current:
 *   get:
 *     summary: Get current user's active subscription
 *     description: Returns the current active subscription for the authenticated user.
 *     tags:
 *       - Subscriptions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current subscription retrieved successfully
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
 *                       $ref: '#/components/schemas/SubscriptionWithPackage'
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
router.get('/me/current', requireRole(UserRole.USER, UserRole.ADMIN), requestHandler(SubscriptionsController.getMyCurrentSubscription));

/**
 * @swagger
 * /subscriptions/initialize:
 *   post:
 *     summary: Initialize a subscription payment
 *     description: Initializes a Paystack payment session for a subscription plan.
 *     tags:
 *       - Subscriptions
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - package_id
 *               - callback_url
 *             properties:
 *               package_id:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               callback_url:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/payment/callback"
 *     responses:
 *       200:
 *         description: Payment session initialized successfully
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
 *                     authorization_url:
 *                       type: string
 *                       example: "https://checkout.paystack.com/xxx"
 *                     reference:
 *                       type: string
 *                       example: "sub_abc123_def456"
 *                     access_code:
 *                       type: string
 *                       example: "access_code_here"
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
 */
router.post('/initialize', requireRole(UserRole.USER, UserRole.ADMIN), requestHandler(SubscriptionsController.initializeSubscription));

/**
 * @swagger
 * /subscriptions/me/{id}/cancel:
 *   post:
 *     summary: Cancel user's subscription
 *     description: Cancels the user's subscription. This will cancel the subscription on Paystack and mark it as cancelled locally.
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
 *         description: Forbidden - Not the subscription owner
 *       404:
 *         description: Subscription not found
 */
router.post('/me/:id/cancel', requireRole(UserRole.USER, UserRole.ADMIN), requestHandler(SubscriptionsController.cancelMySubscription));

/**
 * @swagger
 * /subscriptions/me/{id}/refund:
 *   post:
 *     summary: Request a refund for subscription
 *     description: Requests a refund for the user's subscription. Refunds are only available within 7 days of purchase and only for active subscriptions.
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
 *         description: Subscription refunded successfully
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
 *                       example: "Subscription refunded successfully"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *       400:
 *         description: Bad request - Refund period exceeded, subscription not active, or already refunded
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Not the subscription owner
 *       404:
 *         description: Subscription not found
 *       502:
 *         description: Bad gateway - Failed to process refund with payment provider
 */
router.post('/me/:id/refund', requireRole(UserRole.USER, UserRole.ADMIN), requestHandler(SubscriptionsController.refundMySubscription));

/**
 * @swagger
 * /subscriptions/me/{id}/change-plan:
 *   post:
 *     summary: Change subscription plan
 *     description: Upgrades or downgrades the user's subscription to a different plan. Cancels the current subscription and initializes a new payment session for the new plan.
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
 *         description: The current subscription ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - new_package_id
 *               - callback_url
 *             properties:
 *               new_package_id:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               callback_url:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/payment/callback"
 *     responses:
 *       200:
 *         description: Plan change initiated successfully
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
 *                     authorization_url:
 *                       type: string
 *                       example: "https://checkout.paystack.com/xxx"
 *                     reference:
 *                       type: string
 *                       example: "sub_abc123_def456"
 *                     access_code:
 *                       type: string
 *                       example: "access_code_here"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *       400:
 *         description: Bad request - Invalid input data or already subscribed to this package
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Not the subscription owner
 *       404:
 *         description: Subscription or package not found
 */
router.post('/me/:id/change-plan', requireRole(UserRole.USER, UserRole.ADMIN), requestHandler(SubscriptionsController.changeSubscriptionPlan));

/**
 * @swagger
 * /subscriptions:
 *   get:
 *     summary: Get all subscriptions (Admin only)
 *     description: Returns a paginated list of all subscriptions with their packages and permissions.
 *     tags:
 *       - Subscriptions
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, expired, cancelled, refunded]
 *         description: Filter by subscription status
 *       - in: query
 *         name: profile_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by user profile ID
 *     responses:
 *       200:
 *         description: Subscriptions retrieved successfully
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
 *                       type: object
 *                       nullable: true
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
 */
router.get('/', requireRole(UserRole.ADMIN), requestHandler(SubscriptionsController.getSubscriptions));

/**
 * @swagger
 * /subscriptions/{id}:
 *   get:
 *     summary: Get a subscription by ID (Admin only)
 *     description: Returns a single subscription by its ID.
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
 *         description: Subscription retrieved successfully
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
 *                       $ref: '#/components/schemas/SubscriptionWithPackage'
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
router.get('/:id', requireRole(UserRole.ADMIN), requestHandler(SubscriptionsController.getSubscriptionById));

/**
 * @swagger
 * /subscriptions:
 *   post:
 *     summary: Create a subscription (Admin only)
 *     description: Assigns a package to a user by creating a new subscription.
 *     tags:
 *       - Subscriptions
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSubscriptionRequest'
 *     responses:
 *       201:
 *         description: Subscription created successfully
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
 *                   example: 201
 *       400:
 *         description: Bad request - Invalid input data, invalid profile ID, or invalid package ID
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post('/', requireRole(UserRole.ADMIN), requestHandler(SubscriptionsController.createSubscription));

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
router.patch('/:id', requireRole(UserRole.ADMIN), requestHandler(SubscriptionsController.updateSubscription));

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
router.delete('/:id', requireRole(UserRole.ADMIN), requestHandler(SubscriptionsController.cancelSubscription));

export default router;
