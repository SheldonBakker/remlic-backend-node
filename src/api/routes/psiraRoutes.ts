import { Router } from 'express';
import { list, getApplicant, create, remove } from '../controllers/psiraController.js';
import { requireRole, UserRole } from '../middleware/authMiddleware.js';
import { requireRouteSubscription } from '../middleware/subscriptionMiddleware.js';

const requireSubscription = requireRouteSubscription('/psira');

const router = Router();

router.use(requireRole(UserRole.USER));
router.use(requireSubscription);

/**
 * @swagger
 * components:
 *   schemas:
 *     PsiraOfficer:
 *       type: object
 *       properties:
 *         FirstName:
 *           type: string
 *           example: "John"
 *         LastName:
 *           type: string
 *           example: "Doe"
 *         Gender:
 *           type: string
 *           example: "Male"
 *         RequestStatus:
 *           type: string
 *           example: "Registered"
 *         SIRANo:
 *           type: string
 *           example: "4661969"
 *         ExpiryDate:
 *           type: string
 *           example: "17 Mar 2026"
 *     SavedPsiraOfficer:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         profile_id:
 *           type: string
 *           format: uuid
 *         id_number:
 *           type: string
 *           example: "9803035727088"
 *         first_name:
 *           type: string
 *           example: "John"
 *         last_name:
 *           type: string
 *           example: "Doe"
 *         gender:
 *           type: string
 *           example: "Male"
 *         request_status:
 *           type: string
 *           example: "Registered"
 *         sira_no:
 *           type: string
 *           example: "4661969"
 *         expiry_date:
 *           type: string
 *           example: "17 Mar 2026"
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     CreatePsiraOfficerRequest:
 *       type: object
 *       required:
 *         - IDNumber
 *         - FirstName
 *         - LastName
 *         - Gender
 *         - RequestStatus
 *         - SIRANo
 *         - ExpiryDate
 *       properties:
 *         IDNumber:
 *           type: string
 *           pattern: '^\d{13}$'
 *           example: "9803035727088"
 *         FirstName:
 *           type: string
 *           example: "John"
 *         LastName:
 *           type: string
 *           example: "Doe"
 *         Gender:
 *           type: string
 *           example: "Male"
 *         RequestStatus:
 *           type: string
 *           example: "Registered"
 *         SIRANo:
 *           type: string
 *           example: "4661969"
 *         ExpiryDate:
 *           type: string
 *           example: "17 Mar 2026"
 */

/**
 * @swagger
 * /psira:
 *   get:
 *     summary: Get paginated officers for the authenticated user
 *     description: Returns a paginated list of PSIRA officers saved by the authenticated user using cursor-based pagination.
 *     tags:
 *       - PSIRA
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
 *         name: id_number
 *         schema:
 *           type: string
 *         description: Search for an officer by ID number (exact match)
 *         example: "9803035727088"
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
 *           default: desc
 *         description: Sort order (ascending or descending)
 *     responses:
 *       200:
 *         description: Officers retrieved successfully
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
 *                     officers:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SavedPsiraOfficer'
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
 * /psira:
 *   post:
 *     summary: Save a PSIRA officer
 *     description: Creates a new PSIRA officer record for the authenticated user.
 *     tags:
 *       - PSIRA
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePsiraOfficerRequest'
 *     responses:
 *       201:
 *         description: Officer created successfully
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
 *                     officer:
 *                       $ref: '#/components/schemas/SavedPsiraOfficer'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *       400:
 *         description: Bad request - Validation failed
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
 *         description: Conflict - Officer with this ID number already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', create);

/**
 * @swagger
 * /psira/lookup/{idNumber}:
 *   get:
 *     summary: Lookup PSIRA applicant details by ID number
 *     description: Fetches security officer registration details from PSIRA external API by South African ID number.
 *     tags:
 *       - PSIRA
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idNumber
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\d{13}$'
 *         description: South African ID number (13 digits)
 *         example: "9803035727088"
 *     responses:
 *       200:
 *         description: PSIRA details retrieved successfully
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
 *                     officers:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PsiraOfficer'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *       400:
 *         description: Bad request - Invalid ID number format
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
 *       502:
 *         description: Bad Gateway - Failed to fetch data from PSIRA API
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/lookup/:idNumber', getApplicant);

/**
 * @swagger
 * /psira/{id}:
 *   delete:
 *     summary: Delete a saved officer
 *     description: Deletes a PSIRA officer record by its ID if it belongs to the authenticated user.
 *     tags:
 *       - PSIRA
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The officer record ID
 *     responses:
 *       200:
 *         description: Officer deleted successfully
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
 *                       example: "Officer deleted successfully"
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
 *         description: Officer not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', remove);

export default router;
