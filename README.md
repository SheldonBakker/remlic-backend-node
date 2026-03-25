# Remlic Backend

Express v5 + TypeScript backend for the Remlic firearms license management system.

## Installation

**Prerequisites:** Node >= 20.0.0

1. Install dependencies: `npm install`
2. Configure environment: `cp .env.example .env` and add credentials
3. Start development server: `npm run dev` (runs on http://localhost:8080)

## Portainer Deployment

This repository now includes a `docker-compose.yml` for Portainer or a standard Docker Compose deployment. The stack runs two services from the same image:

- `backend`: serves the HTTP API on `http://192.168.1.38:8181`
- `worker`: runs the scheduled background jobs independently of API traffic

1. Create a new Portainer stack from this repository.
2. Use the included `docker-compose.yml`.
3. In the Portainer stack environment UI, provide the required secrets and runtime values:
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `DATABASE_URL`,
   `RSA_V1_PK_128`, `RSA_V1_PK_74`, `RSA_V2_PK_128`, `RSA_V2_PK_74`,
   plus any optional values such as `CORS_ORIGINS`, `KLAVIYO_PRIVATE_API_KEY`,
   `ONESIGNAL_APP_ID`, and `ONESIGNAL_REST_API_KEY`.
4. Deploy the stack. The backend will be exposed on `http://192.168.1.38:8181`.

After deployment, verify:
- Health check: `http://192.168.1.38:8181/api/v1/health`
- Swagger UI: `http://192.168.1.38:8181/api/docs`
- Worker logs show the cron jobs registering on startup

## API Documentation

Comprehensive API documentation is available in [docs/API.md](docs/API.md).

The documentation includes:
- Complete authentication guide with JWT setup
- All 61 endpoints with request/response examples
- Pagination, filtering, and sorting patterns
- Subscription-based access control
- Error handling and common scenarios
- Code examples in cURL, JavaScript, and TypeScript

**Interactive Documentation:** Visit `http://localhost:8080/api/docs` (Swagger UI) when the server is running.

## Project Structure

```
src/
├── api/                          # HTTP layer
│   ├── controllers/              # Request handlers
│   │   ├── AuthController.ts
│   │   ├── CertificatesController.ts
│   │   ├── ContactsController.ts
│   │   ├── DashboardController.ts
│   │   ├── FirearmsController.ts
│   │   ├── PsiraController.ts
│   │   ├── RemindersController.ts
│   │   ├── SubscriptionsController.ts
│   │   ├── VehicleController.ts
│   │   └── WebhookController.ts
│   ├── middleware/               # Auth, error handling, request logging
│   │   ├── auth.ts
│   │   ├── errorHandler.ts
│   │   └── .ts
│   └── routes/                   # Route definitions with Swagger docs
│       ├── authRoutes.ts
│       ├── certificatesRoutes.ts
│       ├── contactsRoutes.ts
│       ├── dashboardRoutes.ts
│       ├── firearmsRoutes.ts
│       ├── psiraRoutes.ts
│       ├── remindersRoutes.ts
│       ├── subscriptionsRoutes.ts
│       ├── vehicleRoutes.ts
│       ├── webhookRoutes.ts
│       └── index.ts
├── infrastructure/               # External services
│   ├── database/                 # Supabase client + domain methods
│   │   ├── auth/
│   │   │   ├── types.ts
│   │   │   ├── validation.ts
│   │   │   └── authMethods.ts
│   │   ├── certificates/
│   │   │   ├── types.ts
│   │   │   ├── validation.ts
│   │   │   └── certificatesMethods.ts
│   │   ├── contacts/
│   │   │   ├── types.ts
│   │   │   ├── validation.ts
│   │   │   └── contactsMethods.ts
│   │   ├── dashboard/
│   │   │   ├── types.ts
│   │   │   └── dashboardMethods.ts
│   │   ├── firearms/
│   │   │   ├── types.ts
│   │   │   ├── validation.ts
│   │   │   └── firearmsMethods.ts
│   │   ├── psira/
│   │   │   ├── types.ts
│   │   │   ├── validation.ts
│   │   │   └── psiraMethods.ts
│   │   ├── reminders/
│   │   │   ├── types.ts
│   │   │   ├── validation.ts
│   │   │   └── remindersMethods.ts
│   │   ├── subscriptions/
│   │   │   ├── types.ts
│   │   │   ├── validation.ts
│   │   │   └── subscriptionMethods.ts
│   │   ├── vehicle/
│   │   │   ├── types.ts
│   │   │   ├── validation.ts
│   │   │   └── vehicleMethods.ts
│   │   └── supabaseClient.ts
│   └── config/                   # Environment + Swagger config
│       ├── env.ts
│       └── swagger.ts
└── shared/                       # Cross-layer code
    ├── types/                    # Request types, API response types, errors
    │   ├── api.ts
    │   ├── errors.ts
    │   └── request.ts
    ├── constants/                # HTTP status codes
    │   └── httpStatus.ts
    └── utils/                    # Logger, ResponseUtil, PaginationUtil
        ├── Logger.ts
        ├── PaginationUtil.ts
        └── ResponseUtil.ts
```
