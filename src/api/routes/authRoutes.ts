import { Router } from 'express';
import { signup } from '../controllers/authController.js';

const router = Router();

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account with email, phone, and password. The user will receive a verification email. Default role is "User".
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - phone
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *                 example: user@example.com
 *               phone:
 *                 type: string
 *                 description: Phone number in E.164 format
 *                 example: "+1234567890"
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 maxLength: 72
 *                 description: User password (min 8 characters)
 *                 example: securePassword123
 *     responses:
 *       201:
 *         description: User registered successfully
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
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         email:
 *                           type: string
 *                           format: email
 *                         phone:
 *                           type: string
 *                     message:
 *                       type: string
 *                       example: "User registered successfully. Please check your email to verify your account."
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *       400:
 *         description: Validation error - Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Conflict - User already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error during registration
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/signup', signup);

export default router;
