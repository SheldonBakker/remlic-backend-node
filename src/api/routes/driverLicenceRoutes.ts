import { Router } from 'express';
import { list, create, update, remove } from '../controllers/driverLicenceController.js';
import { requireRole, UserRole } from '../middleware/authMiddleware.js';
import { requireRouteSubscription } from '../middleware/subscriptionMiddleware.js';

const requireSubscription = requireRouteSubscription('/driver-licences');

const router = Router();

router.use(requireRole(UserRole.USER));
router.use(requireSubscription);

/**
 * @swagger
 * components:
 *   schemas:
 *     DriverLicence:
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
 *         surname:
 *           type: string
 *           example: "Smith"
 *         initials:
 *           type: string
 *           example: "J.A."
 *         id_number:
 *           type: string
 *           example: "9001015009087"
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
 *     CreateDriverLicenceRequest:
 *       type: object
 *       required:
 *         - surname
 *         - initials
 *         - id_number
 *         - expiry_date
 *       properties:
 *         surname:
 *           type: string
 *           example: "Smith"
 *         initials:
 *           type: string
 *           example: "J.A."
 *           description: Must contain only uppercase letters, spaces, and periods
 *         id_number:
 *           type: string
 *           example: "9001015009087"
 *           description: Must be exactly 13 digits
 *         expiry_date:
 *           type: string
 *           format: date
 *           example: "2025-12-31"
 *     UpdateDriverLicenceRequest:
 *       type: object
 *       minProperties: 1
 *       properties:
 *         surname:
 *           type: string
 *           example: "Smith"
 *         initials:
 *           type: string
 *           example: "J.A."
 *           description: Must contain only uppercase letters, spaces, and periods
 *         id_number:
 *           type: string
 *           example: "9001015009087"
 *           description: Must be exactly 13 digits
 *         expiry_date:
 *           type: string
 *           format: date
 *           example: "2025-12-31"
 */

/**
 * @swagger
 * /driver-licences:
 *   get:
 *     summary: Get paginated driver licences for the authenticated user
 *     description: Returns a paginated list of driver licences belonging to the authenticated user using cursor-based pagination.
 *       Supports filtering by surname (partial match) and ID number (exact match), and sorting by surname, expiry date, or created date.
 *     tags:
 *       - Driver Licences
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
 *         name: surname
 *         schema:
 *           type: string
 *         description: Filter by surname (case-insensitive partial match)
 *       - in: query
 *         name: id_number
 *         schema:
 *           type: string
 *         description: Filter by exact ID number (13 digits)
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [surname, expiry_date, created_at]
 *         description: Field to sort by
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order (ascending or descending)
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: If provided, return a single driver licence by ID instead of a list
 *     responses:
 *       200:
 *         description: Driver licences retrieved successfully
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
 *                     driver_licences:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/DriverLicence'
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
 * /driver-licences:
 *   post:
 *     summary: Create a new driver licence
 *     description: Creates a new driver licence for the authenticated user.
 *     tags:
 *       - Driver Licences
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDriverLicenceRequest'
 *     responses:
 *       201:
 *         description: Driver licence created successfully
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
 *                     driver_licence:
 *                       $ref: '#/components/schemas/DriverLicence'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *       400:
 *         description: Bad request - Missing required fields or invalid format
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
 * /driver-licences/{id}:
 *   patch:
 *     summary: Update a driver licence
 *     description: Updates a driver licence by its ID if it belongs to the authenticated user. At least one field must be provided.
 *     tags:
 *       - Driver Licences
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The driver licence ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateDriverLicenceRequest'
 *     responses:
 *       200:
 *         description: Driver licence updated successfully
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
 *                     driver_licence:
 *                       $ref: '#/components/schemas/DriverLicence'
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
 *         description: Driver licence not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:id', update);

/**
 * @swagger
 * /driver-licences/{id}:
 *   delete:
 *     summary: Delete a driver licence
 *     description: Deletes a driver licence by its ID if it belongs to the authenticated user.
 *     tags:
 *       - Driver Licences
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The driver licence ID
 *     responses:
 *       200:
 *         description: Driver licence deleted successfully
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
 *                       example: "Driver licence deleted successfully"
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
 *         description: Driver licence not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', remove);

export default router;
