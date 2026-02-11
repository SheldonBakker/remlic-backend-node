import { Router } from 'express';
import ProfileController from '../controllers/profileController.js';

import { requireRole, UserRole } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * @swagger
 * /profile:
 *   get:
 *     summary: Get current user's profile
 *     description: Returns the profile information of the authenticated user.
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
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
 *                     profile:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                           example: "123e4567-e89b-12d3-a456-426614174000"
 *                         email:
 *                           type: string
 *                           format: email
 *                           example: "user@example.com"
 *                         phone:
 *                           type: string
 *                           example: "+1234567890"
 *                         role:
 *                           type: string
 *                           example: "User"
 *                         created_at:
 *                           type: string
 *                           format: date-time
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
 *         description: Profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', requireRole(UserRole.USER), (ProfileController.getProfile));

export default router;
