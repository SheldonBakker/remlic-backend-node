import { Router } from 'express';
import { list, create, update, remove } from '../controllers/vehicleController.js';
import { requireRole, UserRole } from '../middleware/authMiddleware.js';
import { requireRouteSubscription } from '../middleware/subscriptionMiddleware.js';

const requireSubscription = requireRouteSubscription('/vehicle');

const router = Router();

router.use(requireRole(UserRole.USER));
router.use(requireSubscription);

/**
 * @swagger
 * components:
 *   schemas:
 *     Vehicle:
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
 *         make:
 *           type: string
 *           example: "Toyota"
 *         model:
 *           type: string
 *           example: "Hilux"
 *         year:
 *           type: integer
 *           example: 2022
 *         vin_number:
 *           type: string
 *           example: "1HGBH41JXMN109186"
 *           nullable: true
 *         registration_number:
 *           type: string
 *           example: "CA 123-456"
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
 *     CreateVehicleRequest:
 *       type: object
 *       required:
 *         - make
 *         - model
 *         - year
 *         - registration_number
 *         - expiry_date
 *       properties:
 *         make:
 *           type: string
 *           example: "Toyota"
 *         model:
 *           type: string
 *           example: "Hilux"
 *         year:
 *           type: integer
 *           example: 2022
 *         vin_number:
 *           type: string
 *           example: "1HGBH41JXMN109186"
 *           nullable: true
 *         registration_number:
 *           type: string
 *           example: "CA 123-456"
 *         expiry_date:
 *           type: string
 *           format: date
 *           example: "2025-12-31"
 *     UpdateVehicleRequest:
 *       type: object
 *       minProperties: 1
 *       properties:
 *         make:
 *           type: string
 *           example: "Toyota"
 *         model:
 *           type: string
 *           example: "Hilux"
 *         year:
 *           type: integer
 *           example: 2022
 *         vin_number:
 *           type: string
 *           nullable: true
 *           example: "1HGBH41JXMN109186"
 *         registration_number:
 *           type: string
 *           example: "CA 123-456"
 *         expiry_date:
 *           type: string
 *           format: date
 *           example: "2025-12-31"
 */

/**
 * @swagger
 * /vehicle:
 *   get:
 *     summary: Get paginated vehicles for the authenticated user
 *     description: Returns a paginated list of vehicles belonging to the authenticated user using cursor-based pagination.
 *       Supports filtering by year and registration number, and sorting by year or expiry date.
 *     tags:
 *       - Vehicle
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
 *         name: year
 *         schema:
 *           type: integer
 *           minimum: 1900
 *         description: Filter by exact year (e.g., 2022)
 *       - in: query
 *         name: registration_number
 *         schema:
 *           type: string
 *         description: Filter by exact registration number (e.g., "CA 123-456")
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [year, expiry_date]
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
 *         description: If provided, return a single vehicle by ID instead of a list
 *     responses:
 *       200:
 *         description: Vehicles retrieved successfully
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
 *                     vehicles:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Vehicle'
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
 * /vehicle:
 *   post:
 *     summary: Create a new vehicle
 *     description: Creates a new vehicle for the authenticated user.
 *     tags:
 *       - Vehicle
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateVehicleRequest'
 *     responses:
 *       201:
 *         description: Vehicle created successfully
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
 *                     vehicle:
 *                       $ref: '#/components/schemas/Vehicle'
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
 *       409:
 *         description: Conflict - Vehicle with this VIN already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', create);

/**
 * @swagger
 * /vehicle/{id}:
 *   patch:
 *     summary: Update a vehicle
 *     description: Updates a vehicle by its ID if it belongs to the authenticated user. At least one field must be provided.
 *     tags:
 *       - Vehicle
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The vehicle ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateVehicleRequest'
 *     responses:
 *       200:
 *         description: Vehicle updated successfully
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
 *                     vehicle:
 *                       $ref: '#/components/schemas/Vehicle'
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
 *         description: Vehicle not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:id', update);

/**
 * @swagger
 * /vehicle/{id}:
 *   delete:
 *     summary: Delete a vehicle
 *     description: Deletes a vehicle by its ID if it belongs to the authenticated user.
 *     tags:
 *       - Vehicle
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The vehicle ID
 *     responses:
 *       200:
 *         description: Vehicle deleted successfully
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
 *                       example: "Vehicle deleted successfully"
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
 *         description: Vehicle not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', remove);

export default router;
