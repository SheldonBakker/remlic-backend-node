import { Router } from 'express';
import { list, create, update, remove } from '../controllers/firearmsController.js';
import { requireRole, UserRole } from '../middleware/authMiddleware.js';
import { requireRouteSubscription } from '../middleware/subscriptionMiddleware.js';

const requireSubscription = requireRouteSubscription('/firearms');

const router = Router();

router.use(requireRole(UserRole.USER));
router.use(requireSubscription);

/**
 * @swagger
 * components:
 *   schemas:
 *     Firearm:
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
 *         type:
 *           type: string
 *           example: "Handgun"
 *         make:
 *           type: string
 *           example: "Glock"
 *         model:
 *           type: string
 *           example: "G19"
 *         caliber:
 *           type: string
 *           example: "9mm"
 *         serial_number:
 *           type: string
 *           nullable: true
 *           example: "ABC123456"
 *         expiry_date:
 *           type: string
 *           format: date
 *           example: "2025-12-31"
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     CreateFirearmRequest:
 *       type: object
 *       required:
 *         - type
 *         - make
 *         - model
 *         - caliber
 *         - expiry_date
 *       properties:
 *         type:
 *           type: string
 *           example: "Handgun"
 *         make:
 *           type: string
 *           example: "Glock"
 *         model:
 *           type: string
 *           example: "G19"
 *         caliber:
 *           type: string
 *           example: "9mm"
 *         serial_number:
 *           type: string
 *           example: "ABC123456"
 *         expiry_date:
 *           type: string
 *           format: date
 *           example: "2025-12-31"
 *     UpdateFirearmRequest:
 *       type: object
 *       minProperties: 1
 *       properties:
 *         type:
 *           type: string
 *           example: "Handgun"
 *         make:
 *           type: string
 *           example: "Glock"
 *         model:
 *           type: string
 *           example: "G19"
 *         caliber:
 *           type: string
 *           example: "9mm"
 *         serial_number:
 *           type: string
 *           nullable: true
 *           example: "ABC123456"
 *         expiry_date:
 *           type: string
 *           format: date
 *           example: "2025-12-31"
 */

/**
 * @swagger
 * /firearms:
 *   get:
 *     summary: Get paginated firearms for the authenticated user
 *     description: Returns a paginated list of firearms belonging to the authenticated user using cursor-based pagination.
 *     tags:
 *       - Firearms
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
 *         name: serial_number
 *         schema:
 *           type: string
 *         description: Filter by exact serial number match
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [expiry_date]
 *         description: Field to sort by
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order (ascending or descending)
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: If provided, return a single firearm by ID instead of a list
 *     responses:
 *       200:
 *         description: Firearms retrieved successfully
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
 *                     firearms:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Firearm'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     nextCursor:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         created_at:
 *                           type: string
 *                           format: date-time
 *                         id:
 *                           type: string
 *                           format: uuid
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
 * /firearms:
 *   post:
 *     summary: Create a new firearm
 *     description: Creates a new firearm for the authenticated user.
 *     tags:
 *       - Firearms
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateFirearmRequest'
 *     responses:
 *       201:
 *         description: Firearm created successfully
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
 *                     firearm:
 *                       $ref: '#/components/schemas/Firearm'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *       400:
 *         description: Bad request - Missing required fields
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
router.post('/', create);

/**
 * @swagger
 * /firearms/{id}:
 *   patch:
 *     summary: Update a firearm
 *     description: Updates a firearm by its ID if it belongs to the authenticated user. At least one field must be provided.
 *     tags:
 *       - Firearms
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The firearm ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateFirearmRequest'
 *     responses:
 *       200:
 *         description: Firearm updated successfully
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
 *                     firearm:
 *                       $ref: '#/components/schemas/Firearm'
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
 *       404:
 *         description: Firearm not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:id', update);

/**
 * @swagger
 * /firearms/{id}:
 *   delete:
 *     summary: Delete a firearm
 *     description: Deletes a firearm by its ID if it belongs to the authenticated user.
 *     tags:
 *       - Firearms
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The firearm ID
 *     responses:
 *       200:
 *         description: Firearm deleted successfully
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
 *                       example: "Firearm deleted successfully"
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
 *       404:
 *         description: Firearm not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', remove);

export default router;
