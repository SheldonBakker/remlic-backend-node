import { Router } from 'express';
import { decrypt } from '../controllers/decryptController.js';
import { requireRole, UserRole } from '../middleware/authMiddleware.js';

const router = Router();
router.use(requireRole(UserRole.USER));
/**
 * @swagger
 * components:
 *   schemas:
 *     SADriversLicense:
 *       type: object
 *       properties:
 *         version:
 *           type: integer
 *           example: 1
 *         vehicleCodes:
 *           type: array
 *           items:
 *             type: string
 *           example: ["B", "C1", "", ""]
 *         surname:
 *           type: string
 *           example: "SMITH"
 *         initials:
 *           type: string
 *           example: "J"
 *         professionalDrivingPermitCodes:
 *           type: array
 *           items:
 *             type: string
 *           nullable: true
 *         idCountry:
 *           type: string
 *           example: "ZA"
 *         licenseCountry:
 *           type: string
 *           example: "ZA"
 *         vehicleRestrictions:
 *           type: array
 *           items:
 *             type: string
 *         licenseNumber:
 *           type: string
 *           example: "12345678"
 *         idNumber:
 *           type: string
 *           example: "9001015009087"
 *         idNumberType:
 *           type: string
 *           nullable: true
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           nullable: true
 *         gender:
 *           type: string
 *           nullable: true
 *           enum: [M, F]
 *         driverRestrictions:
 *           type: string
 *           nullable: true
 *         licenseIssueNumber:
 *           type: string
 *           nullable: true
 *         licenseStartDate:
 *           type: string
 *           format: date
 *           nullable: true
 *         expiryDate:
 *           type: string
 *           format: date
 *           nullable: true
 *         professionalDrivingPermitExpiry:
 *           type: string
 *           format: date
 *           nullable: true
 *         vehicleLicenses:
 *           type: array
 *           nullable: true
 *           items:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               restriction:
 *                 type: string
 *               firstIssueDate:
 *                 type: string
 *                 format: date
 *     SAVehicleLicense:
 *       type: object
 *       properties:
 *         version:
 *           type: integer
 *           example: 1
 *         registrationNumber:
 *           type: string
 *           example: "CA123456"
 *         vin:
 *           type: string
 *           nullable: true
 *         make:
 *           type: string
 *           nullable: true
 *         model:
 *           type: string
 *           nullable: true
 *         licenseDiscExpiry:
 *           type: string
 *           format: date
 *           nullable: true
 *         ownerIdNumber:
 *           type: string
 *           nullable: true
 *         ownerName:
 *           type: string
 *           nullable: true
 *         engineNumber:
 *           type: string
 *           nullable: true
 *         color:
 *           type: string
 *           nullable: true
 *         vehicleType:
 *           type: string
 *           nullable: true
 */

/**
 * @swagger
 * /decrypt/{type}:
 *   post:
 *     summary: Decrypt a SA license barcode
 *     description: Decrypts and parses the barcode data from a South African driver's license or vehicle license disc.
 *     tags:
 *       - Decrypt
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [drivers, vehicle]
 *         description: The type of license to decrypt
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - barcodeData
 *             properties:
 *               barcodeData:
 *                 type: string
 *                 format: byte
 *                 description: Base64-encoded barcode data from SA license
 *                 example: "AQEC..."
 *     responses:
 *       200:
 *         description: License decrypted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/SADriversLicense'
 *                     - $ref: '#/components/schemas/SAVehicleLicense'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *       400:
 *         description: Bad request - Invalid or missing barcode data / type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       422:
 *         description: Unprocessable entity - Barcode could not be decrypted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:type', decrypt);

export default router;
