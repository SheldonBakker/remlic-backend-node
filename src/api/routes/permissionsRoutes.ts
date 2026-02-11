import { Router } from 'express';
import PermissionsController from '../controllers/permissionsController.js';

import { requireRole, UserRole } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Permission:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         permission_name:
 *           type: string
 *           example: "Basic Access"
 *         psira_access:
 *           type: boolean
 *           example: true
 *         firearm_access:
 *           type: boolean
 *           example: false
 *         vehicle_access:
 *           type: boolean
 *           example: true
 *         certificate_access:
 *           type: boolean
 *           example: false
 *         drivers_access:
 *           type: boolean
 *           example: false
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     CreatePermissionRequest:
 *       type: object
 *       required:
 *         - permission_name
 *       properties:
 *         permission_name:
 *           type: string
 *           example: "Basic Access"
 *         psira_access:
 *           type: boolean
 *           example: true
 *         firearm_access:
 *           type: boolean
 *           example: false
 *         vehicle_access:
 *           type: boolean
 *           example: true
 *         certificate_access:
 *           type: boolean
 *           example: false
 *         drivers_access:
 *           type: boolean
 *           example: false
 *     UpdatePermissionRequest:
 *       type: object
 *       minProperties: 1
 *       properties:
 *         permission_name:
 *           type: string
 *           example: "Updated Access"
 *         psira_access:
 *           type: boolean
 *           example: true
 *         firearm_access:
 *           type: boolean
 *           example: true
 *         vehicle_access:
 *           type: boolean
 *           example: true
 *         certificate_access:
 *           type: boolean
 *           example: true
 *         drivers_access:
 *           type: boolean
 *           example: true
 */

/**
 * @swagger
 * /permissions:
 *   get:
 *     summary: Get all permissions (Admin only)
 *     description: Returns a paginated list of all permission sets.
 *     tags:
 *       - Permissions
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
 *     responses:
 *       200:
 *         description: Permissions retrieved successfully
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
 *                     permissions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Permission'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     nextCursor:
 *                       type: object
 *                       nullable: true
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/', requireRole(UserRole.ADMIN), (PermissionsController.getPermissions));

/**
 * @swagger
 * /permissions/{id}:
 *   get:
 *     summary: Get a specific permission by ID (Admin only)
 *     description: Returns a single permission by its ID.
 *     tags:
 *       - Permissions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The permission ID
 *     responses:
 *       200:
 *         description: Permission retrieved successfully
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
 *                     permission:
 *                       $ref: '#/components/schemas/Permission'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Permission not found
 */
router.get('/:id', requireRole(UserRole.ADMIN), (PermissionsController.getPermissionById));

/**
 * @swagger
 * /permissions:
 *   post:
 *     summary: Create a new permission set (Admin only)
 *     description: Creates a new permission set defining access levels.
 *     tags:
 *       - Permissions
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePermissionRequest'
 *     responses:
 *       201:
 *         description: Permission created successfully
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
 *                     permission:
 *                       $ref: '#/components/schemas/Permission'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *       400:
 *         description: Bad request - Invalid input data
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post('/', requireRole(UserRole.ADMIN), (PermissionsController.createPermission));

/**
 * @swagger
 * /permissions/{id}:
 *   patch:
 *     summary: Update a permission set (Admin only)
 *     description: Updates a permission set by its ID. At least one field must be provided.
 *     tags:
 *       - Permissions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The permission ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePermissionRequest'
 *     responses:
 *       200:
 *         description: Permission updated successfully
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
 *                     permission:
 *                       $ref: '#/components/schemas/Permission'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *       400:
 *         description: Bad request - Invalid input data
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Permission not found
 */
router.patch('/:id', requireRole(UserRole.ADMIN), (PermissionsController.updatePermission));

/**
 * @swagger
 * /permissions/{id}:
 *   delete:
 *     summary: Delete a permission set (Admin only)
 *     description: Deletes a permission set by its ID. Cannot delete if linked to packages.
 *     tags:
 *       - Permissions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The permission ID
 *     responses:
 *       200:
 *         description: Permission deleted successfully
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
 *                       example: "Permission deleted successfully"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Permission not found
 *       409:
 *         description: Conflict - Permission is linked to packages
 */
router.delete('/:id', requireRole(UserRole.ADMIN), (PermissionsController.deletePermission));

export default router;
