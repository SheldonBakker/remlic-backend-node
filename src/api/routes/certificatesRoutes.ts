import { Router } from 'express';
import { list, create, update, remove } from '../controllers/certificatesController.js';
import { requireRole, UserRole } from '../middleware/authMiddleware.js';
import { requireRouteSubscription } from '../middleware/subscriptionMiddleware.js';

const requireSubscription = requireRouteSubscription('/certificates');

const router = Router();

router.use(requireRole(UserRole.USER));
router.use(requireSubscription);

/**
 * @swagger
 * components:
 *   schemas:
 *     Certificate:
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
 *           example: "First Aid"
 *         first_name:
 *           type: string
 *           example: "John"
 *         last_name:
 *           type: string
 *           example: "Doe"
 *         certificate_number:
 *           type: string
 *           example: "CERT-2024-001"
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
 *     CreateCertificateRequest:
 *       type: object
 *       required:
 *         - type
 *         - first_name
 *         - last_name
 *         - certificate_number
 *         - expiry_date
 *       properties:
 *         type:
 *           type: string
 *           example: "First Aid"
 *         first_name:
 *           type: string
 *           example: "John"
 *         last_name:
 *           type: string
 *           example: "Doe"
 *         certificate_number:
 *           type: string
 *           example: "CERT-2024-001"
 *         expiry_date:
 *           type: string
 *           format: date
 *           example: "2025-12-31"
 *     UpdateCertificateRequest:
 *       type: object
 *       minProperties: 1
 *       properties:
 *         type:
 *           type: string
 *           example: "First Aid"
 *         first_name:
 *           type: string
 *           example: "John"
 *         last_name:
 *           type: string
 *           example: "Doe"
 *         certificate_number:
 *           type: string
 *           example: "CERT-2024-001"
 *         expiry_date:
 *           type: string
 *           format: date
 *           example: "2025-12-31"
 */

/**
 * @swagger
 * /certificates:
 *   get:
 *     summary: Get paginated certificates for the authenticated user
 *     description: Returns a paginated list of certificates belonging to the authenticated user using cursor-based pagination.
 *     tags:
 *       - Certificates
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
 *         name: certificate_number
 *         schema:
 *           type: string
 *         description: Filter by exact certificate number match
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
 *         description: If provided, return a single certificate by ID instead of a list
 *     responses:
 *       200:
 *         description: Certificates retrieved successfully
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
 *                     certificates:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Certificate'
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
 * /certificates:
 *   post:
 *     summary: Create a new certificate
 *     description: Creates a new certificate for the authenticated user.
 *     tags:
 *       - Certificates
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCertificateRequest'
 *     responses:
 *       201:
 *         description: Certificate created successfully
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
 *                     certificate:
 *                       $ref: '#/components/schemas/Certificate'
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
 * /certificates/{id}:
 *   patch:
 *     summary: Update a certificate
 *     description: Updates a certificate by its ID if it belongs to the authenticated user. At least one field must be provided.
 *     tags:
 *       - Certificates
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The certificate ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCertificateRequest'
 *     responses:
 *       200:
 *         description: Certificate updated successfully
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
 *                     certificate:
 *                       $ref: '#/components/schemas/Certificate'
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
 *         description: Certificate not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:id', update);

/**
 * @swagger
 * /certificates/{id}:
 *   delete:
 *     summary: Delete a certificate
 *     description: Deletes a certificate by its ID if it belongs to the authenticated user.
 *     tags:
 *       - Certificates
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The certificate ID
 *     responses:
 *       200:
 *         description: Certificate deleted successfully
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
 *                       example: "Certificate deleted successfully"
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
 *         description: Certificate not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', remove);

export default router;
