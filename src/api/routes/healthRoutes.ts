import { Router } from 'express';
import { check } from '../controllers/healthController.js';


const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     description: Returns the current health status of the API including version and uptime information.
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: API is healthy
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
 *                     status:
 *                       type: string
 *                       enum: [healthy, unhealthy]
 *                       example: healthy
 *                     version:
 *                       type: string
 *                       example: v1
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     uptime:
 *                       type: number
 *                       description: Server uptime in seconds
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', check);

export default router;
