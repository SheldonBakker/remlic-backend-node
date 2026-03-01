import { Router } from 'express';
import { list, getBySlug, create, update, remove } from '../controllers/packagesController.js';
import { requireRole, UserRole } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Package:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         package_name:
 *           type: string
 *           example: "Basic Monthly"
 *         slug:
 *           type: string
 *           example: "basic-monthly"
 *         type:
 *           type: string
 *           enum: [monthly, yearly]
 *           example: "monthly"
 *         permission_id:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         description:
 *           type: string
 *           nullable: true
 *           example: "Basic monthly subscription package"
 *         is_active:
 *           type: boolean
 *           example: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     PackageWithPermission:
 *       allOf:
 *         - $ref: '#/components/schemas/Package'
 *         - type: object
 *           properties:
 *             app_permissions:
 *               $ref: '#/components/schemas/Permission'
 *     CreatePackageRequest:
 *       type: object
 *       required:
 *         - package_name
 *         - slug
 *         - type
 *         - permission_id
 *       properties:
 *         package_name:
 *           type: string
 *           example: "Basic Monthly"
 *         slug:
 *           type: string
 *           example: "basic-monthly"
 *         type:
 *           type: string
 *           enum: [monthly, yearly]
 *           example: "monthly"
 *         permission_id:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         description:
 *           type: string
 *           example: "Basic monthly subscription package"
 *     UpdatePackageRequest:
 *       type: object
 *       minProperties: 1
 *       properties:
 *         package_name:
 *           type: string
 *           example: "Updated Package Name"
 *         slug:
 *           type: string
 *           example: "updated-slug"
 *         type:
 *           type: string
 *           enum: [monthly, yearly]
 *           example: "yearly"
 *         permission_id:
 *           type: string
 *           format: uuid
 *         description:
 *           type: string
 *           nullable: true
 *         is_active:
 *           type: boolean
 */

/**
 * @swagger
 * /packages:
 *   get:
 *     summary: Get all packages (Admin only)
 *     description: Returns a paginated list of all packages with their permissions.
 *     tags:
 *       - Packages
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
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [monthly, yearly]
 *         description: Filter by package type
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: If provided, return a single package by ID instead of a list
 *     responses:
 *       200:
 *         description: Packages retrieved successfully
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
 *                     packages:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PackageWithPermission'
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
router.get('/', requireRole(UserRole.ADMIN), list);

/**
 * @swagger
 * /packages/slug/{slug}:
 *   get:
 *     summary: Get a package by slug (User)
 *     description: Returns a single active package by its slug. Available to all authenticated users.
 *     tags:
 *       - Packages
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: The package slug
 *     responses:
 *       200:
 *         description: Package retrieved successfully
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
 *                     package:
 *                       $ref: '#/components/schemas/PackageWithPermission'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Package not found
 */
router.get('/slug/:slug', requireRole(UserRole.USER, UserRole.ADMIN), getBySlug);

/**
 * @swagger
 * /packages:
 *   post:
 *     summary: Create a new package (Admin only)
 *     description: Creates a new subscription package linked to a permission set.
 *     tags:
 *       - Packages
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePackageRequest'
 *     responses:
 *       201:
 *         description: Package created successfully
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
 *                     package:
 *                       $ref: '#/components/schemas/Package'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *       400:
 *         description: Bad request - Invalid input data or invalid permission ID
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin access required
 *       409:
 *         description: Conflict - Package with this slug already exists
 */
router.post('/', requireRole(UserRole.ADMIN), create);

/**
 * @swagger
 * /packages/{id}:
 *   patch:
 *     summary: Update a package (Admin only)
 *     description: Updates a package by its ID. At least one field must be provided.
 *     tags:
 *       - Packages
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The package ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePackageRequest'
 *     responses:
 *       200:
 *         description: Package updated successfully
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
 *                     package:
 *                       $ref: '#/components/schemas/Package'
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
 *         description: Package not found
 *       409:
 *         description: Conflict - Package with this slug already exists
 */
router.patch('/:id', requireRole(UserRole.ADMIN), update);

/**
 * @swagger
 * /packages/{id}:
 *   delete:
 *     summary: Deactivate a package (Admin only)
 *     description: Soft deletes a package by setting is_active to false.
 *     tags:
 *       - Packages
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The package ID
 *     responses:
 *       200:
 *         description: Package deactivated successfully
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
 *                       example: "Package deactivated successfully"
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
 *         description: Package not found
 */
router.delete('/:id', requireRole(UserRole.ADMIN), remove);

export default router;
