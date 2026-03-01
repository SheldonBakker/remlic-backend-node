import { Router } from 'express';
import { listExpiring } from '../controllers/dashboardController.js';
import { requireRole, UserRole } from '../middleware/authMiddleware.js';
import { requireAnySubscription } from '../middleware/subscriptionMiddleware.js';

const router = Router();

router.use(requireRole(UserRole.USER));
router.use(requireAnySubscription());

/**
 * @swagger
 * components:
 *   schemas:
 *     ExpiringRecord:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         record_type:
 *           type: string
 *           enum: [firearms, vehicles, psira_officers, certificates]
 *           example: "firearms"
 *         name:
 *           type: string
 *           example: "Glock G19 (Handgun)"
 *         identifier:
 *           type: string
 *           example: "ABC123456"
 *         expiry_date:
 *           type: string
 *           format: date
 *           example: "2025-03-15"
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /dashboard/expiring:
 *   get:
 *     summary: Get all records with expiry dates for the authenticated user
 *     description: >
 *       Returns a paginated list of firearms, vehicles, PSIRA officer records, and certificates
 *       with expiring dates. Requires days_ahead and include_expired parameters to control filtering.
 *       Records are sorted by expiry date (oldest first by default).
 *     tags:
 *       - Dashboard
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
 *         name: record_type
 *         schema:
 *           type: string
 *           enum: [firearms, vehicles, psira_officers, certificates]
 *         description: Filter by record type. If omitted, returns all types.
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order by expiry date. 'asc' shows oldest first (default), 'desc' shows newest first.
 *       - in: query
 *         name: days_ahead
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *         description: Number of days ahead to check for expiring records (1-365)
 *       - in: query
 *         name: include_expired
 *         required: true
 *         schema:
 *           type: boolean
 *         description: Include already expired records (true/false)
 *     responses:
 *       200:
 *         description: Expiring records retrieved successfully
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
 *                     expiring_records:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ExpiringRecord'
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
 *       400:
 *         description: Bad Request - Invalid filter parameters
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
router.get('/expiring', listExpiring);

export default router;
