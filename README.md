# Remlic Backend

Express.js v5 + TypeScript backend for the Remlic firearms license management system.

## Installation

**Prerequisites:** Node.js >= 20.0.0

1. Install dependencies: `npm install`
2. Configure environment: `cp .env.example .env` and add credentials
3. Start development server: `npm run dev` (runs on http://localhost:8080)

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
