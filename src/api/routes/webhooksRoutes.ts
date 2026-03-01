import { Router } from 'express';
import { handlePaystackWebhook } from '../controllers/webhooksController.js';


const router = Router();

/**
 * @swagger
 * /webhooks/paystack:
 *   post:
 *     summary: Paystack webhook endpoint
 *     description: Receives and processes Paystack webhook events for subscription management.
 *     tags:
 *       - Webhooks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event:
 *                 type: string
 *                 example: "subscription.create"
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Webhook received successfully
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
 *                     received:
 *                       type: boolean
 *                       example: true
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *       400:
 *         description: Bad request - Missing signature
 *       401:
 *         description: Unauthorized - Invalid signature
 */
router.post('/paystack', handlePaystackWebhook);

export default router;
