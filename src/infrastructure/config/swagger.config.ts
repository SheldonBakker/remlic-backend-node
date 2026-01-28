import path from 'path';
import { fileURLToPath } from 'url';
import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './env.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Remlic API',
      version: config.app.apiVersion,
      description: 'Remlic Backend REST API documentation',
    },
    servers: [
      { url: `http://localhost:${config.app.port}/api/${config.app.apiVersion}`, description: 'Development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            statusCode: { type: 'integer' },
          },
        },
      },
    },
  },
  apis: [path.join(__dirname, '../../api/routes/*.ts')],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);

export const swaggerUiOptions = {
  customSiteTitle: 'Remlic API Docs',
  customCss: '.swagger-ui .topbar { display: none }',
};
