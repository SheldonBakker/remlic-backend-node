import { Router } from 'express';
import { send } from '../controllers/contactController.js';

const router = Router();

/**
 * @swagger
 * /contact:
 *   post:
 *     summary: Submit a contact form
 *     description: Sends a contact form message to the support team at support@firearmstudio.com
 *     tags:
 *       - Contact
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - subject
 *               - message
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Sender's email address
 *                 example: user@example.com
 *               subject:
 *                 type: string
 *                 description: Email subject
 *                 maxLength: 200
 *                 example: Question about licensing
 *               message:
 *                 type: string
 *                 description: Email message content
 *                 maxLength: 5000
 *                 example: I have a question about the licensing process...
 *     responses:
 *       200:
 *         description: Message sent successfully
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
 *                       example: Your message has been sent successfully.
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *       400:
 *         description: Validation error - Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to send message
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', send);

export default router;
