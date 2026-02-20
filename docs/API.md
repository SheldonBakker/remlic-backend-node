# Remlic API Documentation

**Version:** v1
**Last Updated:** February 15, 2026

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Authentication & Authorization](#authentication--authorization)
4. [Core Concepts](#core-concepts)
5. [API Reference](#api-reference)
   - [Health Check](#health-check)
   - [Authentication](#authentication)
   - [Profile Management](#profile-management)
   - [Firearms Management](#firearms-management)
   - [Vehicle Management](#vehicle-management)
   - [Certificates Management](#certificates-management)
   - [Driver Licences Management](#driver-licences-management)
   - [PSIRA Officers Management](#psira-officers-management)
   - [Dashboard](#dashboard)
   - [Subscriptions](#subscriptions)
   - [Packages](#packages)
   - [Permissions](#permissions)
   - [Reminder Settings](#reminder-settings)
   - [Contact](#contact)
   - [Webhooks](#webhooks)
6. [Common Patterns & Examples](#common-patterns--examples)
7. [Error Reference](#error-reference)
8. [Data Models](#data-models)
9. [Webhooks Integration](#webhooks-integration)
10. [Appendix](#appendix)

---

## Introduction

The Remlic API is a RESTful API for managing firearms licenses, vehicles, certificates, driver licences, and PSIRA officer records. It provides comprehensive functionality for tracking expiry dates, managing subscriptions, and setting up renewal reminders.

### Base URLs

- **Development:** `http://localhost:8080/api/v1`
- **Production:** Your production URL

### Interactive API Documentation

An interactive Swagger UI is available at:
- **Development:** `http://localhost:8080/api/docs`
- **OpenAPI Spec:** `http://localhost:8080/api/docs.json`

### Support

For support or questions, please contact: support@firearmstudio.com

---

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- A Remlic account (sign up via `/auth/signup`)
- Basic understanding of REST APIs and JWT authentication

### Quick Start Guide

#### Step 1: Sign Up

Create a new user account:

```bash
curl -X POST http://localhost:8080/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "phone": "+27123456789",
    "password": "SecurePassword123!"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "phone": "+27123456789"
    },
    "message": "User registered successfully. Please check your email to verify your account."
  },
  "timestamp": "2026-02-15T10:30:00.000Z",
  "statusCode": 201
}
```

#### Step 2: Verify Email

Check your email and click the verification link sent by Supabase.

#### Step 3: Sign In

Use the Supabase client in your application to sign in and obtain a JWT token:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'SecurePassword123!'
});

if (data?.session) {
  const accessToken = data.session.access_token;
  // Use this token in API requests
}
```

#### Step 4: Make Your First Authenticated Request

```bash
curl -X GET http://localhost:8080/api/v1/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "phone": "+27123456789",
      "role": "User",
      "created_at": "2026-02-15T10:30:00.000Z"
    }
  },
  "timestamp": "2026-02-15T10:31:00.000Z",
  "statusCode": 200
}
```

---

## Authentication & Authorization

### JWT Authentication

The API uses JWT (JSON Web Token) authentication powered by Supabase. All protected endpoints require a valid JWT token in the `Authorization` header.

#### Authentication Flow

```
┌─────────┐          ┌──────────────┐          ┌─────────┐
│ Client  │          │ Remlic API   │          │Supabase │
└────┬────┘          └──────┬───────┘          └────┬────┘
     │                      │                       │
     │  POST /auth/signup   │                       │
     ├─────────────────────>│                       │
     │                      │  Create user account  │
     │                      ├──────────────────────>│
     │                      │    User created       │
     │                      │<──────────────────────┤
     │   201 Created        │                       │
     │<─────────────────────┤                       │
     │                      │                       │
     │  User signs in       │                       │
     │  (Supabase client)   │                       │
     ├──────────────────────────────────────────────>│
     │                      │      JWT Token        │
     │<──────────────────────────────────────────────┤
     │                      │                       │
     │  API requests        │                       │
     │  with JWT            │                       │
     ├─────────────────────>│                       │
     │                      │   Verify JWT          │
     │                      ├──────────────────────>│
     │                      │   Valid ✓             │
     │                      │<──────────────────────┤
     │  Response            │                       │
     │<─────────────────────┤                       │
```

### Using JWT Tokens

Include your JWT token in the `Authorization` header using the Bearer scheme:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Example with cURL:**
```bash
curl -X GET http://localhost:8080/api/v1/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Example with JavaScript (fetch):**
```javascript
const response = await fetch('http://localhost:8080/api/v1/profile', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

**Example with TypeScript (axios):**
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const response = await api.get('/profile');
```

### Role-Based Access Control

The API supports two user roles:

- **USER** - Regular users who can manage their own records
- **ADMIN** - Administrators with access to all user data and system management

**Role Hierarchy:**
- ADMIN users have all USER permissions plus administrative capabilities
- ADMIN users bypass subscription checks

### Subscription-Based Access Control

Most resource endpoints require an active subscription with specific feature permissions:

| Feature Permission    | Required For                           |
|-----------------------|----------------------------------------|
| `firearm_access`      | /firearms endpoints                    |
| `vehicle_access`      | /vehicle endpoints                     |
| `certificate_access`  | /certificates endpoints                |
| `drivers_access`      | /driver-licences endpoints             |
| `psira_access`        | /psira endpoints                       |
| Any active subscription | /dashboard/expiring                  |

**Check Your Permissions:**
```bash
curl -X GET http://localhost:8080/api/v1/subscriptions/me/permissions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "permissions": {
      "psira_access": true,
      "firearm_access": true,
      "vehicle_access": true,
      "certificate_access": false,
      "drivers_access": true,
      "active_subscriptions": 1
    }
  },
  "timestamp": "2026-02-15T10:35:00.000Z",
  "statusCode": 200
}
```

### Feature Access Matrix

| Route Prefix          | Auth Required | Role Required | Subscription Required     |
|-----------------------|---------------|---------------|---------------------------|
| /auth/signup          | No            | None          | None                      |
| /health               | No            | None          | None                      |
| /contact              | No            | None          | None                      |
| /webhooks/paystack    | No (signature)| None          | None                      |
| /profile              | Yes           | USER          | None                      |
| /firearms             | Yes           | USER          | firearm_access            |
| /vehicle              | Yes           | USER          | vehicle_access            |
| /certificates         | Yes           | USER          | certificate_access        |
| /driver-licences      | Yes           | USER          | drivers_access            |
| /psira                | Yes           | USER          | psira_access              |
| /dashboard/expiring   | Yes           | USER          | Any active subscription   |
| /subscriptions/me     | Yes           | USER          | None                      |
| /settings/reminders   | Yes           | USER          | None                      |
| /subscriptions (admin)| Yes           | ADMIN         | None (bypass)             |
| /packages             | Yes           | ADMIN*        | None (bypass)             |
| /permissions          | Yes           | ADMIN         | None (bypass)             |

*Note: `/packages/slug/:slug` is accessible to USER role

---

## Core Concepts

### Standard Response Format

All API responses follow a consistent structure:

**Success Response:**
```json
{
  "success": true,
  "data": {
    // Response data (object or array)
  },
  "timestamp": "2026-02-15T10:30:00.000Z",
  "statusCode": 200,
  "pagination": {  // Optional, only for paginated endpoints
    "nextCursor": "eyJjcmVhdGVkX2F0IjoiMjAyNi0wMi0xNVQxMDozMDowMC4wMDBaIiwiaWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAifQ=="
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "statusCode": 400,
    "timestamp": "2026-02-15T10:30:00.000Z",
    "path": "/api/v1/firearms"
  }
}
```

### Cursor-Based Pagination

The API uses cursor-based pagination for efficient data retrieval.

#### How It Works

```
Database Records (sorted by created_at, id):
┌──────────────────────────────────────────────────┐
│ Item 1  created_at: 2024-01-01T00:00:00Z  id: A  │
│ Item 2  created_at: 2024-01-01T00:00:01Z  id: B  │
│ Item 3  created_at: 2024-01-01T00:00:02Z  id: C  │
│ Item 4  created_at: 2024-01-01T00:00:03Z  id: D  │
│ Item 5  created_at: 2024-01-01T00:00:04Z  id: E  │
└──────────────────────────────────────────────────┘

Request 1: GET /firearms?limit=2
Response: Items [1, 2] + nextCursor (points to Item 2)

Request 2: GET /firearms?limit=2&cursor={nextCursor}
Response: Items [3, 4] + nextCursor (points to Item 4)
```

#### Query Parameters

- `cursor` (string, optional) - Base64-encoded cursor from previous response
- `limit` (integer, optional) - Number of items per page (default: 20, max: 100)

#### Example

**First Page:**
```bash
curl -X GET "http://localhost:8080/api/v1/firearms?limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "firearms": [
      { "id": "...", "make": "Glock", ... },
      { "id": "...", "make": "Smith & Wesson", ... }
    ]
  },
  "pagination": {
    "nextCursor": "eyJjcmVhdGVkX2F0IjoiMjAyNi0wMi0xNVQxMDozMDowMC4wMDBaIiwiaWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAifQ=="
  },
  "timestamp": "2026-02-15T10:30:00.000Z",
  "statusCode": 200
}
```

**Next Page:**
```bash
curl -X GET "http://localhost:8080/api/v1/firearms?limit=20&cursor=eyJjcmVhdGVkX2F0IjoiMjAyNi0wMi0xNVQxMDozMDowMC4wMDBaIiwiaWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAifQ==" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**End of Results:**
When there are no more items, the response will not include a `pagination.nextCursor` field.

### Filtering & Sorting

Many endpoints support filtering and sorting through query parameters.

**Common Filtering Parameters:**
- `serial_number` - Filter by serial number (exact match)
- `registration_number` - Filter by registration number (exact match)
- `id_number` - Filter by ID number (exact match)
- `surname` - Filter by surname (case-insensitive, partial match)
- `year` - Filter by year (exact match)
- `record_type` - Filter by record type

**Common Sorting Parameters:**
- `sort_by` - Field to sort by (e.g., `expiry_date`, `created_at`, `year`)
- `sort_order` - Sort direction: `asc` or `desc` (default varies by endpoint)

**Example:**
```bash
# Get all firearms sorted by expiry date (ascending)
curl -X GET "http://localhost:8080/api/v1/firearms?sort_by=expiry_date&sort_order=asc" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get vehicles from year 2023
curl -X GET "http://localhost:8080/api/v1/vehicle?year=2023" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Error Handling

The API uses standard HTTP status codes and returns detailed error messages.

#### Error Response Structure

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "statusCode": 400,
    "timestamp": "2026-02-15T10:30:00.000Z",
    "path": "/api/v1/firearms"
  },
  "details": [  // Only in development environment
    { "field": "make", "message": "Make is required" },
    { "field": "expiry_date", "message": "Invalid date format" }
  ]
}
```

#### Handling Errors in Your Application

```javascript
async function handleApiRequest() {
  try {
    const response = await fetch('http://localhost:8080/api/v1/firearms', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();

    if (!data.success) {
      // Handle API error
      switch (data.error.statusCode) {
        case 401:
          // Token expired or invalid - redirect to login
          console.error('Unauthorized - please log in again');
          break;
        case 403:
          // Insufficient permissions or subscription required
          console.error('Forbidden - check your subscription');
          break;
        case 429:
          // Rate limit exceeded - retry after delay
          console.error('Too many requests - please wait');
          break;
        default:
          console.error('API Error:', data.error.message);
      }
      return null;
    }

    return data.data;
  } catch (error) {
    // Network error
    console.error('Network error:', error);
    return null;
  }
}
```

### Rate Limiting

To ensure fair usage, the API implements rate limiting:

- **Limit:** 100 requests per 15-minute window
- **Headers:** Rate limit information is provided in response headers
- **Error Response:** HTTP 429 (Too Many Requests)

```json
{
  "success": false,
  "message": "Too many requests, please try again later."
}
```

### CORS Policy

The API supports Cross-Origin Resource Sharing (CORS) for the following origins:

**Development:**
- `http://localhost:5173`
- `http://localhost:3000`

**Production:**
- `https://vite-frontend-remlic.vercel.app`
- `https://firearmstudio.com`
- `https://www.firearmstudio.com`
- `https://remlic.co.za`
- `https://www.remlic.co.za`

**Allowed Methods:** GET, POST, PUT, PATCH, DELETE, OPTIONS
**Allowed Headers:** Content-Type, Authorization
**Credentials:** Enabled

---

## API Reference

### Health Check

#### GET /health

Check the API health status, version, and uptime.

**Authentication:** Not Required

**Request:**
```bash
curl -X GET http://localhost:8080/api/v1/health
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "v1",
    "timestamp": "2026-02-15T10:30:00.000Z",
    "uptime": 12345
  },
  "timestamp": "2026-02-15T10:30:00.000Z",
  "statusCode": 200
}
```

---

### Authentication

#### POST /auth/signup

Register a new user account.

**Authentication:** Not Required

**Request Body:**
| Field    | Type   | Required | Description                        |
|----------|--------|----------|------------------------------------|
| email    | string | Yes      | User email address                 |
| phone    | string | Yes      | Phone number in E.164 format       |
| password | string | Yes      | Password (8-72 characters)         |

**Request:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "phone": "+27123456789",
    "password": "SecurePassword123!"
  }'
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "phone": "+27123456789"
    },
    "message": "User registered successfully. Please check your email to verify your account."
  },
  "timestamp": "2026-02-15T10:30:00.000Z",
  "statusCode": 201
}
```

**Error Responses:**
- **400 Bad Request** - Invalid input data (validation error)
- **409 Conflict** - User with this email already exists
- **500 Internal Server Error** - Server error during registration

---

### Profile Management

#### GET /profile

Get the authenticated user's profile information.

**Authentication:** Required
**Role:** USER

**Request:**
```bash
curl -X GET http://localhost:8080/api/v1/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "phone": "+27123456789",
      "role": "User",
      "created_at": "2026-02-15T10:30:00.000Z"
    }
  },
  "timestamp": "2026-02-15T10:31:00.000Z",
  "statusCode": 200
}
```

**Error Responses:**
- **401 Unauthorized** - Invalid or missing token
- **404 Not Found** - Profile not found

---

### Firearms Management

All firearms endpoints require an active subscription with `firearm_access` permission.

#### GET /firearms

List the authenticated user's firearms with pagination, filtering, and sorting.

**Authentication:** Required
**Role:** USER
**Subscription:** firearm_access

**Query Parameters:**
| Parameter     | Type    | Required | Description                                    |
|---------------|---------|----------|------------------------------------------------|
| cursor        | string  | No       | Pagination cursor from previous response       |
| limit         | integer | No       | Items per page (default: 20, max: 100)         |
| serial_number | string  | No       | Filter by serial number (exact match)          |
| sort_by       | string  | No       | Sort field: `expiry_date` (default: created_at)|
| sort_order    | string  | No       | Sort direction: `asc` or `desc` (default: desc)|

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/firearms?limit=20&sort_by=expiry_date&sort_order=asc" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "firearms": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "type": "Handgun",
        "make": "Glock",
        "model": "G19",
        "caliber": "9mm",
        "serial_number": "ABC123456",
        "expiry_date": "2025-12-31",
        "profile_id": "user-id",
        "created_at": "2026-02-15T10:30:00.000Z",
        "updated_at": "2026-02-15T10:30:00.000Z"
      }
    ]
  },
  "pagination": {
    "nextCursor": "eyJjcmVhdGVkX2F0IjoiMjAyNi0wMi0xNVQxMDozMDowMC4wMDBaIiwiaWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAifQ=="
  },
  "timestamp": "2026-02-15T10:30:00.000Z",
  "statusCode": 200
}
```

**Error Responses:**
- **401 Unauthorized** - Invalid or missing token
- **403 Forbidden** - No firearm_access subscription

---

#### GET /firearms/:id

Get a specific firearm by ID.

**Authentication:** Required
**Role:** USER
**Subscription:** firearm_access

**Path Parameters:**
| Parameter | Type   | Required | Description  |
|-----------|--------|----------|--------------|
| id        | string | Yes      | Firearm UUID |

**Request:**
```bash
curl -X GET http://localhost:8080/api/v1/firearms/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "firearm": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "Handgun",
      "make": "Glock",
      "model": "G19",
      "caliber": "9mm",
      "serial_number": "ABC123456",
      "expiry_date": "2025-12-31",
      "profile_id": "user-id",
      "created_at": "2026-02-15T10:30:00.000Z",
      "updated_at": "2026-02-15T10:30:00.000Z"
    }
  },
  "timestamp": "2026-02-15T10:30:00.000Z",
  "statusCode": 200
}
```

**Error Responses:**
- **401 Unauthorized** - Invalid or missing token
- **403 Forbidden** - No firearm_access subscription
- **404 Not Found** - Firearm not found or not owned by user

---

#### POST /firearms

Create a new firearm record.

**Authentication:** Required
**Role:** USER
**Subscription:** firearm_access

**Request Body:**
| Field         | Type   | Required | Description                    |
|---------------|--------|----------|--------------------------------|
| type          | string | Yes      | Firearm type                   |
| make          | string | Yes      | Manufacturer                   |
| model         | string | Yes      | Model name                     |
| caliber       | string | Yes      | Caliber/ammunition type        |
| serial_number | string | No       | Serial number                  |
| expiry_date   | string | Yes      | Expiry date (YYYY-MM-DD)       |

**Request:**
```bash
curl -X POST http://localhost:8080/api/v1/firearms \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "Handgun",
    "make": "Glock",
    "model": "G19",
    "caliber": "9mm",
    "serial_number": "ABC123456",
    "expiry_date": "2025-12-31"
  }'
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "firearm": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "Handgun",
      "make": "Glock",
      "model": "G19",
      "caliber": "9mm",
      "serial_number": "ABC123456",
      "expiry_date": "2025-12-31",
      "profile_id": "user-id",
      "created_at": "2026-02-15T10:30:00.000Z",
      "updated_at": "2026-02-15T10:30:00.000Z"
    }
  },
  "timestamp": "2026-02-15T10:30:00.000Z",
  "statusCode": 201
}
```

**Error Responses:**
- **400 Bad Request** - Validation error
- **401 Unauthorized** - Invalid or missing token
- **403 Forbidden** - No firearm_access subscription

---

#### PATCH /firearms/:id

Update a firearm record (partial update).

**Authentication:** Required
**Role:** USER
**Subscription:** firearm_access

**Path Parameters:**
| Parameter | Type   | Required | Description  |
|-----------|--------|----------|--------------|
| id        | string | Yes      | Firearm UUID |

**Request Body:** (All fields optional, at least one required)
| Field         | Type   | Required | Description                    |
|---------------|--------|----------|--------------------------------|
| type          | string | No       | Firearm type                   |
| make          | string | No       | Manufacturer                   |
| model         | string | No       | Model name                     |
| caliber       | string | No       | Caliber/ammunition type        |
| serial_number | string | No       | Serial number                  |
| expiry_date   | string | No       | Expiry date (YYYY-MM-DD)       |

**Request:**
```bash
curl -X PATCH http://localhost:8080/api/v1/firearms/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "expiry_date": "2026-12-31"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "firearm": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "Handgun",
      "make": "Glock",
      "model": "G19",
      "caliber": "9mm",
      "serial_number": "ABC123456",
      "expiry_date": "2026-12-31",
      "profile_id": "user-id",
      "created_at": "2026-02-15T10:30:00.000Z",
      "updated_at": "2026-02-15T10:35:00.000Z"
    }
  },
  "timestamp": "2026-02-15T10:35:00.000Z",
  "statusCode": 200
}
```

**Error Responses:**
- **400 Bad Request** - Validation error or no fields to update
- **401 Unauthorized** - Invalid or missing token
- **403 Forbidden** - No firearm_access subscription
- **404 Not Found** - Firearm not found or not owned by user

---

#### DELETE /firearms/:id

Delete a firearm record.

**Authentication:** Required
**Role:** USER
**Subscription:** firearm_access

**Path Parameters:**
| Parameter | Type   | Required | Description  |
|-----------|--------|----------|--------------|
| id        | string | Yes      | Firearm UUID |

**Request:**
```bash
curl -X DELETE http://localhost:8080/api/v1/firearms/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Firearm deleted successfully"
  },
  "timestamp": "2026-02-15T10:35:00.000Z",
  "statusCode": 200
}
```

**Error Responses:**
- **401 Unauthorized** - Invalid or missing token
- **403 Forbidden** - No firearm_access subscription
- **404 Not Found** - Firearm not found or not owned by user

---

### Vehicle Management

All vehicle endpoints require an active subscription with `vehicle_access` permission. The endpoints follow the same pattern as Firearms Management.

#### GET /vehicle

List the authenticated user's vehicles with pagination, filtering, and sorting.

**Authentication:** Required
**Role:** USER
**Subscription:** vehicle_access

**Query Parameters:**
| Parameter           | Type    | Required | Description                                          |
|---------------------|---------|----------|------------------------------------------------------|
| cursor              | string  | No       | Pagination cursor from previous response             |
| limit               | integer | No       | Items per page (default: 20, max: 100)               |
| year                | integer | No       | Filter by year (exact match)                         |
| registration_number | string  | No       | Filter by registration number (exact match)          |
| sort_by             | string  | No       | Sort field: `year`, `expiry_date` (default: created_at)|
| sort_order          | string  | No       | Sort direction: `asc` or `desc` (default: desc)      |

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/vehicle?limit=20&sort_by=expiry_date&sort_order=asc" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "vehicles": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "make": "Toyota",
        "model": "Camry",
        "year": 2023,
        "vin_number": "1234567890123456",
        "registration_number": "ABC123GP",
        "expiry_date": "2025-12-31",
        "profile_id": "user-id",
        "created_at": "2026-02-15T10:30:00.000Z",
        "updated_at": "2026-02-15T10:30:00.000Z"
      }
    ]
  },
  "pagination": {
    "nextCursor": "eyJjcmVhdGVkX2F0IjoiMjAyNi0wMi0xNVQxMDozMDowMC4wMDBaIiwiaWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAifQ=="
  },
  "timestamp": "2026-02-15T10:30:00.000Z",
  "statusCode": 200
}
```

#### GET /vehicle/:id

Get a specific vehicle by ID.

**Authentication:** Required
**Role:** USER
**Subscription:** vehicle_access

#### POST /vehicle

Create a new vehicle record.

**Authentication:** Required
**Role:** USER
**Subscription:** vehicle_access

**Request Body:**
| Field               | Type    | Required | Description                      |
|---------------------|---------|----------|----------------------------------|
| make                | string  | Yes      | Vehicle manufacturer             |
| model               | string  | Yes      | Vehicle model                    |
| year                | integer | Yes      | Vehicle year                     |
| vin_number          | string  | No       | VIN number                       |
| registration_number | string  | No       | Registration/license plate       |
| expiry_date         | string  | Yes      | Expiry date (YYYY-MM-DD)         |

**Request:**
```bash
curl -X POST http://localhost:8080/api/v1/vehicle \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "make": "Toyota",
    "model": "Camry",
    "year": 2023,
    "vin_number": "1234567890123456",
    "registration_number": "ABC123GP",
    "expiry_date": "2025-12-31"
  }'
```

#### PATCH /vehicle/:id

Update a vehicle record (partial update).

**Authentication:** Required
**Role:** USER
**Subscription:** vehicle_access

#### DELETE /vehicle/:id

Delete a vehicle record.

**Authentication:** Required
**Role:** USER
**Subscription:** vehicle_access

---

### Certificates Management

All certificate endpoints require an active subscription with `certificate_access` permission.

#### GET /certificates

List the authenticated user's certificates with pagination, filtering, and sorting.

**Authentication:** Required
**Role:** USER
**Subscription:** certificate_access

**Query Parameters:**
| Parameter          | Type    | Required | Description                                    |
|--------------------|---------|----------|------------------------------------------------|
| cursor             | string  | No       | Pagination cursor from previous response       |
| limit              | integer | No       | Items per page (default: 20, max: 100)         |
| certificate_number | string  | No       | Filter by certificate number (exact match)     |
| sort_by            | string  | No       | Sort field: `expiry_date` (default: created_at)|
| sort_order         | string  | No       | Sort direction: `asc` or `desc` (default: desc)|

#### GET /certificates/:id

Get a specific certificate by ID.

**Authentication:** Required
**Role:** USER
**Subscription:** certificate_access

#### POST /certificates

Create a new certificate record.

**Authentication:** Required
**Role:** USER
**Subscription:** certificate_access

**Request Body:**
| Field              | Type   | Required | Description                   |
|--------------------|--------|----------|-------------------------------|
| certificate_type   | string | Yes      | Type of certificate           |
| certificate_number | string | No       | Certificate number            |
| issue_date         | string | Yes      | Issue date (YYYY-MM-DD)       |
| expiry_date        | string | Yes      | Expiry date (YYYY-MM-DD)      |
| issuing_authority  | string | No       | Issuing organization          |

**Request:**
```bash
curl -X POST http://localhost:8080/api/v1/certificates \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "certificate_type": "Competency Certificate",
    "certificate_number": "CERT123456",
    "issue_date": "2024-01-01",
    "expiry_date": "2026-12-31",
    "issuing_authority": "SAPS"
  }'
```

#### PATCH /certificates/:id

Update a certificate record (partial update).

**Authentication:** Required
**Role:** USER
**Subscription:** certificate_access

#### DELETE /certificates/:id

Delete a certificate record.

**Authentication:** Required
**Role:** USER
**Subscription:** certificate_access

---

### Driver Licences Management

All driver licence endpoints require an active subscription with `drivers_access` permission.

#### GET /driver-licences

List the authenticated user's driver licences with pagination, filtering, and sorting.

**Authentication:** Required
**Role:** USER
**Subscription:** drivers_access

**Query Parameters:**
| Parameter  | Type    | Required | Description                                              |
|------------|---------|----------|----------------------------------------------------------|
| cursor     | string  | No       | Pagination cursor from previous response                 |
| limit      | integer | No       | Items per page (default: 20, max: 100)                   |
| surname    | string  | No       | Filter by surname (case-insensitive, partial match)      |
| id_number  | string  | No       | Filter by ID number (exact match, 13 digits)             |
| sort_by    | string  | No       | Sort: `surname`, `expiry_date`, `created_at` (default: created_at)|
| sort_order | string  | No       | Sort direction: `asc` or `desc` (default: desc)          |

#### GET /driver-licences/:id

Get a specific driver licence by ID.

**Authentication:** Required
**Role:** USER
**Subscription:** drivers_access

#### POST /driver-licences

Create a new driver licence record.

**Authentication:** Required
**Role:** USER
**Subscription:** drivers_access

**Request Body:**
| Field          | Type     | Required | Description                                    |
|----------------|----------|----------|------------------------------------------------|
| surname        | string   | Yes      | Surname on licence (max 100 chars)             |
| initials       | string   | Yes      | Initials (max 20 chars)                        |
| id_number      | string   | Yes      | South African ID number (13 digits)            |
| expiry_date    | string   | Yes      | Expiry date (YYYY-MM-DD)                       |
| licence_number | string   | No       | Driver licence number (max 50 chars)           |
| licence_codes  | string[] | No       | Array of licence codes (e.g., ["Code B", "Code C"])|
| issue_date     | string   | No       | Issue date (YYYY-MM-DD)                        |
| date_of_birth  | string   | No       | Date of birth (YYYY-MM-DD)                     |
| gender         | string   | No       | Gender (max 10 chars)                          |
| decoded_data   | object   | No       | Additional decoded data (JSON object)          |

**Request:**
```bash
curl -X POST http://localhost:8080/api/v1/driver-licences \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "surname": "Doe",
    "initials": "J",
    "id_number": "8001015009087",
    "expiry_date": "2025-01-14",
    "licence_number": "DL12345678",
    "licence_codes": ["Code B", "Code C"],
    "issue_date": "2020-01-15",
    "date_of_birth": "1980-01-01",
    "gender": "Male"
  }'
```

#### PATCH /driver-licences/:id

Update a driver licence record (partial update).

**Authentication:** Required
**Role:** USER
**Subscription:** drivers_access

#### DELETE /driver-licences/:id

Delete a driver licence record.

**Authentication:** Required
**Role:** USER
**Subscription:** drivers_access

---

### PSIRA Officers Management

All PSIRA endpoints require an active subscription with `psira_access` permission.

#### GET /psira

List the authenticated user's saved PSIRA officer records with pagination, filtering, and sorting.

**Authentication:** Required
**Role:** USER
**Subscription:** psira_access

**Query Parameters:**
| Parameter  | Type    | Required | Description                                        |
|------------|---------|----------|----------------------------------------------------|
| cursor     | string  | No       | Pagination cursor from previous response           |
| limit      | integer | No       | Items per page (default: 20, max: 100)             |
| id_number  | string  | No       | Filter by ID number (exact match)                  |
| sort_by    | string  | No       | Sort field: `expiry_date` (default: created_at)    |
| sort_order | string  | No       | Sort direction: `asc` or `desc` (default: desc)    |

#### POST /psira

Save a PSIRA officer record to user's account.

**Authentication:** Required
**Role:** USER
**Subscription:** psira_access

**Request Body:**
| Field       | Type   | Required | Description                   |
|-------------|--------|----------|-------------------------------|
| id_number   | string | Yes      | South African ID number       |
| name        | string | Yes      | Officer name                  |
| grade       | string | No       | PSIRA grade                   |
| expiry_date | string | Yes      | Registration expiry (YYYY-MM-DD)|

**Request:**
```bash
curl -X POST http://localhost:8080/api/v1/psira \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id_number": "8001015009087",
    "name": "John Doe",
    "grade": "Grade A",
    "expiry_date": "2025-06-30"
  }'
```

#### GET /psira/lookup/:idNumber

Lookup a PSIRA officer from external PSIRA API by South African ID number.

**Authentication:** Required
**Role:** USER
**Subscription:** psira_access

**Path Parameters:**
| Parameter | Type   | Required | Description                     |
|-----------|--------|----------|---------------------------------|
| idNumber  | string | Yes      | South African ID number (13 digits)|

**Request:**
```bash
curl -X GET http://localhost:8080/api/v1/psira/lookup/8001015009087 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "officer": {
      "id_number": "8001015009087",
      "name": "John Doe",
      "grade": "Grade A",
      "expiry_date": "2025-06-30",
      "registration_status": "Active"
    }
  },
  "timestamp": "2026-02-15T10:30:00.000Z",
  "statusCode": 200
}
```

**Error Responses:**
- **401 Unauthorized** - Invalid or missing token
- **403 Forbidden** - No psira_access subscription
- **404 Not Found** - Officer not found in PSIRA database
- **502 Bad Gateway** - External PSIRA API failure

#### DELETE /psira/:id

Delete a saved PSIRA officer record.

**Authentication:** Required
**Role:** USER
**Subscription:** psira_access

---

### Dashboard

#### GET /dashboard/expiring

Get all expiring records across all domains (firearms, vehicles, certificates, driver licences, PSIRA officers).

**Authentication:** Required
**Role:** USER
**Subscription:** Any active subscription

**Query Parameters:**
| Parameter       | Type    | Required | Description                                                    |
|-----------------|---------|----------|----------------------------------------------------------------|
| cursor          | string  | No       | Pagination cursor from previous response                       |
| limit           | integer | No       | Items per page (default: 20, max: 100)                         |
| days_ahead      | integer | **Yes**  | Days ahead to check for expiry (1-365)                         |
| include_expired | string  | **Yes**  | Include already expired items: `true` or `false`               |
| record_type     | string  | No       | Filter by type: `firearms`, `vehicles`, `certificates`, `driver_licences`, `psira_officers`|
| sort_order      | string  | No       | Sort by expiry date: `asc` or `desc` (default: asc)            |

**Request:**
```bash
# Get all records expiring in next 30 days, excluding already expired
curl -X GET "http://localhost:8080/api/v1/dashboard/expiring?days_ahead=30&include_expired=false&limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get only firearms expiring soon
curl -X GET "http://localhost:8080/api/v1/dashboard/expiring?days_ahead=30&include_expired=false&record_type=firearms" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "expiring_records": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "record_type": "firearms",
        "expiry_date": "2026-03-15",
        "days_until_expiry": 28,
        "is_expired": false,
        "details": {
          "make": "Glock",
          "model": "G19",
          "type": "Handgun"
        }
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440111",
        "record_type": "vehicles",
        "expiry_date": "2026-03-20",
        "days_until_expiry": 33,
        "is_expired": false,
        "details": {
          "make": "Toyota",
          "model": "Camry",
          "registration_number": "ABC123GP"
        }
      }
    ]
  },
  "pagination": {
    "nextCursor": "eyJjcmVhdGVkX2F0IjoiMjAyNi0wMi0xNVQxMDozMDowMC4wMDBaIiwiaWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAifQ=="
  },
  "timestamp": "2026-02-15T10:30:00.000Z",
  "statusCode": 200
}
```

**Error Responses:**
- **400 Bad Request** - Missing required parameters (days_ahead, include_expired)
- **401 Unauthorized** - Invalid or missing token
- **403 Forbidden** - No active subscription

---

### Subscriptions

#### User Endpoints

##### GET /subscriptions/me

Get all subscriptions for the authenticated user.

**Authentication:** Required
**Role:** USER

**Request:**
```bash
curl -X GET http://localhost:8080/api/v1/subscriptions/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "subscriptions": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "profile_id": "user-id",
        "package_id": "package-id",
        "start_date": "2026-01-15",
        "end_date": "2027-01-14",
        "status": "active",
        "payment_reference": "PAY_123456",
        "created_at": "2026-01-15T10:00:00.000Z",
        "updated_at": "2026-01-15T10:00:00.000Z",
        "package": {
          "id": "package-id",
          "package_name": "Basic Monthly",
          "type": "monthly",
          "price": 99.00
        }
      }
    ]
  },
  "timestamp": "2026-02-15T10:30:00.000Z",
  "statusCode": 200
}
```

---

##### GET /subscriptions/me/permissions

Get aggregated permissions from all active subscriptions.

**Authentication:** Required
**Role:** USER

**Request:**
```bash
curl -X GET http://localhost:8080/api/v1/subscriptions/me/permissions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "permissions": {
      "psira_access": true,
      "firearm_access": true,
      "vehicle_access": true,
      "certificate_access": false,
      "drivers_access": true,
      "active_subscriptions": 1
    }
  },
  "timestamp": "2026-02-15T10:30:00.000Z",
  "statusCode": 200
}
```

---

##### GET /subscriptions/me/current

Get the user's current active subscription.

**Authentication:** Required
**Role:** USER

**Request:**
```bash
curl -X GET http://localhost:8080/api/v1/subscriptions/me/current \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "profile_id": "user-id",
      "package_id": "package-id",
      "start_date": "2026-01-15",
      "end_date": "2027-01-14",
      "status": "active",
      "payment_reference": "PAY_123456",
      "package": {
        "package_name": "Basic Monthly",
        "type": "monthly",
        "price": 99.00
      }
    }
  },
  "timestamp": "2026-02-15T10:30:00.000Z",
  "statusCode": 200
}
```

---

##### POST /subscriptions/initialize

Initialize a Paystack payment session for a new subscription.

**Authentication:** Required
**Role:** USER

**Request Body:**
| Field        | Type   | Required | Description                    |
|--------------|--------|----------|--------------------------------|
| package_id   | string | Yes      | UUID of the package to purchase|
| callback_url | string | No       | URL to redirect after payment  |

**Request:**
```bash
curl -X POST http://localhost:8080/api/v1/subscriptions/initialize \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "package_id": "550e8400-e29b-41d4-a716-446655440000",
    "callback_url": "https://yourapp.com/payment/success"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "authorization_url": "https://checkout.paystack.com/xyz123",
    "access_code": "xyz123",
    "reference": "REF_123456789"
  },
  "timestamp": "2026-02-15T10:30:00.000Z",
  "statusCode": 200
}
```

**Next Steps:**
1. Redirect user to `authorization_url`
2. User completes payment on Paystack
3. Paystack sends webhook to `/webhooks/paystack`
4. Subscription is activated automatically

---

##### POST /subscriptions/me/:id/cancel

Cancel a user's subscription.

**Authentication:** Required
**Role:** USER

**Path Parameters:**
| Parameter | Type   | Required | Description       |
|-----------|--------|----------|-------------------|
| id        | string | Yes      | Subscription UUID |

**Request:**
```bash
curl -X POST http://localhost:8080/api/v1/subscriptions/me/550e8400-e29b-41d4-a716-446655440000/cancel \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Subscription cancelled successfully",
    "subscription": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "cancelled"
    }
  },
  "timestamp": "2026-02-15T10:30:00.000Z",
  "statusCode": 200
}
```

---

##### POST /subscriptions/me/:id/refund

Request a refund for a subscription (must be within 7 days of purchase).

**Authentication:** Required
**Role:** USER

**Path Parameters:**
| Parameter | Type   | Required | Description       |
|-----------|--------|----------|-------------------|
| id        | string | Yes      | Subscription UUID |

**Request:**
```bash
curl -X POST http://localhost:8080/api/v1/subscriptions/me/550e8400-e29b-41d4-a716-446655440000/refund \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Refund processed successfully",
    "subscription": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "refunded"
    }
  },
  "timestamp": "2026-02-15T10:30:00.000Z",
  "statusCode": 200
}
```

**Error Responses:**
- **400 Bad Request** - Refund window expired (>7 days since purchase)
- **404 Not Found** - Subscription not found

---

##### POST /subscriptions/me/:id/change-plan

Change subscription plan (upgrade or downgrade).

**Authentication:** Required
**Role:** USER

**Path Parameters:**
| Parameter | Type   | Required | Description       |
|-----------|--------|----------|-------------------|
| id        | string | Yes      | Subscription UUID |

**Request Body:**
| Field         | Type   | Required | Description              |
|---------------|--------|----------|--------------------------|
| new_package_id| string | Yes      | UUID of new package      |

**Request:**
```bash
curl -X POST http://localhost:8080/api/v1/subscriptions/me/550e8400-e29b-41d4-a716-446655440000/change-plan \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "new_package_id": "660e8400-e29b-41d4-a716-446655440111"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Subscription plan changed successfully",
    "subscription": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "package_id": "660e8400-e29b-41d4-a716-446655440111"
    }
  },
  "timestamp": "2026-02-15T10:30:00.000Z",
  "statusCode": 200
}
```

---

#### Admin Endpoints

##### GET /subscriptions

List all subscriptions (admin only) with pagination and filtering.

**Authentication:** Required
**Role:** ADMIN

**Query Parameters:**
| Parameter  | Type    | Required | Description                                                  |
|------------|---------|----------|--------------------------------------------------------------|
| cursor     | string  | No       | Pagination cursor from previous response                     |
| limit      | integer | No       | Items per page (default: 20, max: 100)                       |
| status     | string  | No       | Filter by status: `active`, `expired`, `cancelled`, `refunded`|
| profile_id | string  | No       | Filter by user profile ID                                    |

##### GET /subscriptions/:id

Get a specific subscription by ID (admin only).

**Authentication:** Required
**Role:** ADMIN

##### POST /subscriptions

Create a subscription (admin assigns package to user).

**Authentication:** Required
**Role:** ADMIN

**Request Body:**
| Field             | Type   | Required | Description                   |
|-------------------|--------|----------|-------------------------------|
| profile_id        | string | Yes      | User profile UUID             |
| package_id        | string | Yes      | Package UUID                  |
| start_date        | string | Yes      | Start date (YYYY-MM-DD)       |
| end_date          | string | Yes      | End date (YYYY-MM-DD)         |
| payment_reference | string | No       | Payment reference             |

##### PATCH /subscriptions/:id

Update a subscription (admin only).

**Authentication:** Required
**Role:** ADMIN

##### DELETE /subscriptions/:id

Cancel a subscription (admin only).

**Authentication:** Required
**Role:** ADMIN

---

### Packages

#### GET /packages

List all packages (admin only) with pagination and filtering.

**Authentication:** Required
**Role:** ADMIN

**Query Parameters:**
| Parameter | Type    | Required | Description                                    |
|-----------|---------|----------|------------------------------------------------|
| cursor    | string  | No       | Pagination cursor from previous response       |
| limit     | integer | No       | Items per page (default: 20, max: 100)         |
| is_active | string  | No       | Filter by active status: `true` or `false`     |
| type      | string  | No       | Filter by type: `monthly` or `yearly`          |

**Request:**
```bash
curl -X GET "http://localhost:8080/api/v1/packages?is_active=true&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

#### GET /packages/slug/:slug

Get a package by slug (accessible to users for browsing available packages).

**Authentication:** Required
**Role:** USER

**Path Parameters:**
| Parameter | Type   | Required | Description           |
|-----------|--------|----------|-----------------------|
| slug      | string | Yes      | Package slug          |

**Request:**
```bash
curl -X GET http://localhost:8080/api/v1/packages/slug/basic-monthly \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "package": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "package_name": "Basic Monthly",
      "slug": "basic-monthly",
      "type": "monthly",
      "price": 99.00,
      "description": "Access to firearms and vehicle management",
      "is_active": true,
      "permission_id": "permission-id",
      "permissions": {
        "firearm_access": true,
        "vehicle_access": true,
        "certificate_access": false,
        "drivers_access": false,
        "psira_access": false
      }
    }
  },
  "timestamp": "2026-02-15T10:30:00.000Z",
  "statusCode": 200
}
```

---

#### GET /packages/:id

Get a specific package by ID (admin only).

**Authentication:** Required
**Role:** ADMIN

#### POST /packages

Create a new package (admin only).

**Authentication:** Required
**Role:** ADMIN

**Request Body:**
| Field         | Type    | Required | Description                           |
|---------------|---------|----------|---------------------------------------|
| package_name  | string  | Yes      | Package name                          |
| slug          | string  | Yes      | URL-friendly slug (unique)            |
| type          | string  | Yes      | Package type: `monthly` or `yearly`   |
| price         | number  | Yes      | Price in ZAR                          |
| description   | string  | No       | Package description                   |
| permission_id | string  | Yes      | UUID of permission set                |

#### PATCH /packages/:id

Update a package (admin only).

**Authentication:** Required
**Role:** ADMIN

#### DELETE /packages/:id

Deactivate a package (soft delete, admin only).

**Authentication:** Required
**Role:** ADMIN

---

### Permissions

Permission sets define what features a package grants access to.

#### GET /permissions

List all permission sets (admin only) with pagination.

**Authentication:** Required
**Role:** ADMIN

**Query Parameters:**
| Parameter | Type    | Required | Description                              |
|-----------|---------|----------|------------------------------------------|
| cursor    | string  | No       | Pagination cursor from previous response |
| limit     | integer | No       | Items per page (default: 20, max: 100)   |

#### GET /permissions/:id

Get a specific permission set by ID (admin only).

**Authentication:** Required
**Role:** ADMIN

#### POST /permissions

Create a new permission set (admin only).

**Authentication:** Required
**Role:** ADMIN

**Request Body:**
| Field              | Type    | Required | Description                      |
|--------------------|---------|----------|----------------------------------|
| psira_access       | boolean | Yes      | Access to PSIRA officers         |
| firearm_access     | boolean | Yes      | Access to firearms management    |
| vehicle_access     | boolean | Yes      | Access to vehicle management     |
| certificate_access | boolean | Yes      | Access to certificates           |
| drivers_access     | boolean | Yes      | Access to driver licences        |

**Request:**
```bash
curl -X POST http://localhost:8080/api/v1/permissions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "psira_access": true,
    "firearm_access": true,
    "vehicle_access": true,
    "certificate_access": false,
    "drivers_access": false
  }'
```

#### PATCH /permissions/:id

Update a permission set (admin only).

**Authentication:** Required
**Role:** ADMIN

#### DELETE /permissions/:id

Delete a permission set (admin only, only if not linked to any packages).

**Authentication:** Required
**Role:** ADMIN

**Error Responses:**
- **409 Conflict** - Permission set is linked to existing packages

---

### Reminder Settings

Manage reminder settings for different entity types (firearms, vehicles, certificates, etc.).

#### GET /settings/reminders

Get all reminder settings for the authenticated user.

**Authentication:** Required
**Role:** USER

**Request:**
```bash
curl -X GET http://localhost:8080/api/v1/settings/reminders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reminders": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "profile_id": "user-id",
        "entity_type": "firearms",
        "days_before": 30,
        "is_enabled": true,
        "created_at": "2026-02-15T10:30:00.000Z",
        "updated_at": "2026-02-15T10:30:00.000Z"
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440111",
        "profile_id": "user-id",
        "entity_type": "vehicles",
        "days_before": 60,
        "is_enabled": true,
        "created_at": "2026-02-15T10:30:00.000Z",
        "updated_at": "2026-02-15T10:30:00.000Z"
      }
    ]
  },
  "timestamp": "2026-02-15T10:30:00.000Z",
  "statusCode": 200
}
```

---

#### PUT /settings/reminders

Bulk update multiple reminder settings.

**Authentication:** Required
**Role:** USER

**Request Body:**
Array of reminder settings:
| Field        | Type    | Required | Description                                              |
|--------------|---------|----------|----------------------------------------------------------|
| entity_type  | string  | Yes      | Type: `firearms`, `vehicles`, `certificates`, `psira_officers`|
| days_before  | integer | Yes      | Days before expiry to send reminder (1-365)              |
| is_enabled   | boolean | Yes      | Enable or disable reminder                               |

**Request:**
```bash
curl -X PUT http://localhost:8080/api/v1/settings/reminders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reminders": [
      {
        "entity_type": "firearms",
        "days_before": 30,
        "is_enabled": true
      },
      {
        "entity_type": "vehicles",
        "days_before": 60,
        "is_enabled": true
      }
    ]
  }'
```

---

#### PATCH /settings/reminders/:entityType

Update a single reminder setting by entity type.

**Authentication:** Required
**Role:** USER

**Path Parameters:**
| Parameter   | Type   | Required | Description                                              |
|-------------|--------|----------|----------------------------------------------------------|
| entityType  | string | Yes      | Entity type: `firearms`, `vehicles`, `certificates`, `psira_officers`|

**Request Body:**
| Field       | Type    | Required | Description                              |
|-------------|---------|----------|------------------------------------------|
| days_before | integer | No       | Days before expiry to send reminder      |
| is_enabled  | boolean | No       | Enable or disable reminder               |

**Request:**
```bash
curl -X PATCH http://localhost:8080/api/v1/settings/reminders/firearms \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "days_before": 45,
    "is_enabled": true
  }'
```

---

#### DELETE /settings/reminders/:entityType

Delete a reminder setting by entity type.

**Authentication:** Required
**Role:** USER

**Path Parameters:**
| Parameter  | Type   | Required | Description           |
|------------|--------|----------|-----------------------|
| entityType | string | Yes      | Entity type to delete |

**Request:**
```bash
curl -X DELETE http://localhost:8080/api/v1/settings/reminders/firearms \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Contact

#### POST /contact

Submit a contact form message.

**Authentication:** Not Required

**Request Body:**
| Field   | Type   | Required | Description              |
|---------|--------|----------|--------------------------|
| email   | string | Yes      | Sender's email address   |
| subject | string | Yes      | Message subject          |
| message | string | Yes      | Message content          |

**Request:**
```bash
curl -X POST http://localhost:8080/api/v1/contact \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "subject": "Question about subscriptions",
    "message": "I would like to know more about your pricing plans."
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Message sent successfully. We will get back to you soon."
  },
  "timestamp": "2026-02-15T10:30:00.000Z",
  "statusCode": 200
}
```

**Error Responses:**
- **400 Bad Request** - Validation error (missing required fields)

---

### Webhooks

#### POST /webhooks/paystack

Receive and process Paystack webhook events (payment notifications).

**Authentication:** Signature Verification (Paystack signature in header)
**Role:** None (public endpoint)

**Headers:**
- `x-paystack-signature` - Paystack webhook signature for verification

**Supported Events:**
- `charge.success` - Payment successful, activate subscription
- `subscription.disable` - Subscription cancelled
- `refund.processed` - Refund completed

**Request Example:**
Paystack sends webhook automatically when payment events occur.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Webhook processed successfully"
  },
  "timestamp": "2026-02-15T10:30:00.000Z",
  "statusCode": 200
}
```

**Error Responses:**
- **401 Unauthorized** - Invalid signature
- **400 Bad Request** - Invalid webhook payload

---

## Common Patterns & Examples

### Complete Authentication Flow

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 1. Sign up
async function signup() {
  const response = await fetch('http://localhost:8080/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'user@example.com',
      phone: '+27123456789',
      password: 'SecurePassword123!'
    })
  });

  const data = await response.json();
  console.log(data.message); // "Please check your email to verify..."
}

// 2. User verifies email (clicks link in email)

// 3. Sign in
async function signin() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'user@example.com',
    password: 'SecurePassword123!'
  });

  if (error) {
    console.error('Sign in error:', error);
    return null;
  }

  return data.session.access_token;
}

// 4. Use token in API requests
async function getProfile(token) {
  const response = await fetch('http://localhost:8080/api/v1/profile', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return response.json();
}
```

---

### Pagination Example

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

async function getAllFirearms() {
  const allFirearms = [];
  let cursor = null;

  do {
    const params = cursor ? { cursor, limit: 50 } : { limit: 50 };
    const response = await api.get('/firearms', { params });

    allFirearms.push(...response.data.data.firearms);
    cursor = response.data.pagination?.nextCursor;
  } while (cursor);

  return allFirearms;
}

// Or get just first page
async function getFirstPageFirearms() {
  const response = await api.get('/firearms', {
    params: { limit: 20 }
  });

  return {
    firearms: response.data.data.firearms,
    nextCursor: response.data.pagination?.nextCursor
  };
}
```

---

### Filtering and Sorting Example

```typescript
// Get firearms sorted by expiry date (soonest first)
const response = await api.get('/firearms', {
  params: {
    sort_by: 'expiry_date',
    sort_order: 'asc',
    limit: 50
  }
});

// Get vehicles from year 2023
const vehiclesResponse = await api.get('/vehicle', {
  params: {
    year: 2023,
    limit: 20
  }
});

// Get driver licences by surname (partial match)
const licencesResponse = await api.get('/driver-licences', {
  params: {
    surname: 'Doe',
    sort_by: 'expiry_date',
    sort_order: 'asc'
  }
});
```

---

### Creating Resources Example

```typescript
// Create a firearm
async function createFirearm(token: string) {
  try {
    const response = await axios.post(
      'http://localhost:8080/api/v1/firearms',
      {
        type: 'Handgun',
        make: 'Glock',
        model: 'G19',
        caliber: '9mm',
        serial_number: 'ABC123456',
        expiry_date: '2025-12-31'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Firearm created:', response.data.data.firearm);
    return response.data.data.firearm;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error('Error:', error.response.data.error);

      // Handle validation errors
      if (error.response.data.details) {
        error.response.data.details.forEach((err: any) => {
          console.error(`${err.field}: ${err.message}`);
        });
      }
    }
    throw error;
  }
}
```

---

### Subscription Flow Example

```javascript
// 1. Browse available packages
const packagesResponse = await fetch(
  'http://localhost:8080/api/v1/packages/slug/basic-monthly',
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
const packageData = await packagesResponse.json();
console.log('Package:', packageData.data.package);

// 2. Initialize payment
const paymentResponse = await fetch(
  'http://localhost:8080/api/v1/subscriptions/initialize',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      package_id: packageData.data.package.id,
      callback_url: 'https://yourapp.com/payment/success'
    })
  }
);
const paymentData = await paymentResponse.json();

// 3. Redirect to Paystack
window.location.href = paymentData.data.authorization_url;

// 4. After successful payment (on callback page)
const permissionsResponse = await fetch(
  'http://localhost:8080/api/v1/subscriptions/me/permissions',
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
const permissions = await permissionsResponse.json();
console.log('My permissions:', permissions.data.permissions);
```

---

### Dashboard - Expiring Records Example

```typescript
// Get all items expiring in next 30 days
const expiringResponse = await api.get('/dashboard/expiring', {
  params: {
    days_ahead: 30,
    include_expired: false,
    limit: 100
  }
});

const expiringRecords = expiringResponse.data.data.expiring_records;

// Group by type
const grouped = expiringRecords.reduce((acc, record) => {
  if (!acc[record.record_type]) {
    acc[record.record_type] = [];
  }
  acc[record.record_type].push(record);
  return acc;
}, {});

console.log('Firearms expiring soon:', grouped.firearms?.length || 0);
console.log('Vehicles expiring soon:', grouped.vehicles?.length || 0);

// Get only expired items
const expiredResponse = await api.get('/dashboard/expiring', {
  params: {
    days_ahead: 0,
    include_expired: true,
    limit: 100
  }
});
```

---

## Error Reference

### HTTP Status Codes

| Code | Status                  | Meaning                                                 |
|------|-------------------------|---------------------------------------------------------|
| 200  | OK                      | Request successful                                      |
| 201  | Created                 | Resource created successfully                           |
| 400  | Bad Request             | Invalid request (validation error, missing parameters)  |
| 401  | Unauthorized            | Missing or invalid JWT token                            |
| 403  | Forbidden               | Insufficient permissions or subscription access         |
| 404  | Not Found               | Resource not found or not owned by user                 |
| 409  | Conflict                | Duplicate resource or resource conflict                 |
| 429  | Too Many Requests       | Rate limit exceeded (100 requests per 15 minutes)       |
| 500  | Internal Server Error   | Unexpected server error                                 |
| 502  | Bad Gateway             | External service failure (e.g., PSIRA API, Paystack)    |

### Common Error Scenarios

#### 401 Unauthorized

**Cause:** Missing or invalid JWT token

**Solution:**
- Ensure `Authorization: Bearer {token}` header is present
- Token may be expired - sign in again to get a new token
- Verify token is valid and not corrupted

**Example:**
```json
{
  "success": false,
  "error": {
    "message": "Invalid or expired token",
    "statusCode": 401,
    "timestamp": "2026-02-15T10:30:00.000Z",
    "path": "/api/v1/profile"
  }
}
```

---

#### 403 Forbidden

**Cause:** User lacks required subscription or role

**Solution:**
- Check subscription permissions: `GET /subscriptions/me/permissions`
- Verify active subscription: `GET /subscriptions/me/current`
- Purchase required subscription package

**Example:**
```json
{
  "success": false,
  "error": {
    "message": "Access denied. firearm_access subscription required.",
    "statusCode": 403,
    "timestamp": "2026-02-15T10:30:00.000Z",
    "path": "/api/v1/firearms"
  }
}
```

---

#### 400 Bad Request (Validation Error)

**Cause:** Invalid input data

**Solution:**
- Review validation error details
- Ensure all required fields are provided
- Check field formats (dates, UUIDs, etc.)

**Example:**
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "statusCode": 400,
    "timestamp": "2026-02-15T10:30:00.000Z",
    "path": "/api/v1/firearms"
  },
  "details": [
    { "field": "make", "message": "Make is required" },
    { "field": "expiry_date", "message": "Invalid date format. Use YYYY-MM-DD" }
  ]
}
```

---

#### 404 Not Found

**Cause:** Resource doesn't exist or user doesn't own it

**Solution:**
- Verify resource ID is correct
- Ensure resource belongs to authenticated user
- Check if resource was deleted

**Example:**
```json
{
  "success": false,
  "error": {
    "message": "Firearm not found",
    "statusCode": 404,
    "timestamp": "2026-02-15T10:30:00.000Z",
    "path": "/api/v1/firearms/550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

#### 429 Too Many Requests

**Cause:** Rate limit exceeded (100 requests per 15 minutes)

**Solution:**
- Implement exponential backoff retry logic
- Cache responses where appropriate
- Reduce request frequency

**Example:**
```json
{
  "success": false,
  "message": "Too many requests, please try again later."
}
```

---

## Data Models

### Firearm

```typescript
interface IFirearm {
  id: string;                 // UUID
  type: string;               // e.g., "Handgun", "Rifle"
  make: string;               // Manufacturer
  model: string;              // Model name
  caliber: string;            // e.g., "9mm", ".45 ACP"
  serial_number?: string;     // Serial number (optional)
  expiry_date: string;        // YYYY-MM-DD format
  profile_id: string;         // User UUID
  created_at: string;         // ISO 8601 timestamp
  updated_at: string;         // ISO 8601 timestamp
}
```

---

### Vehicle

```typescript
interface IVehicle {
  id: string;                 // UUID
  make: string;               // Manufacturer
  model: string;              // Model name
  year: number;               // Vehicle year
  vin_number?: string;        // VIN number (optional)
  registration_number?: string; // License plate (optional)
  expiry_date: string;        // YYYY-MM-DD format
  profile_id: string;         // User UUID
  created_at: string;         // ISO 8601 timestamp
  updated_at: string;         // ISO 8601 timestamp
}
```

---

### Certificate

```typescript
interface ICertificate {
  id: string;                 // UUID
  certificate_type: string;   // Type of certificate
  certificate_number?: string;// Certificate number (optional)
  issue_date: string;         // YYYY-MM-DD format
  expiry_date: string;        // YYYY-MM-DD format
  issuing_authority?: string; // Organization (optional)
  profile_id: string;         // User UUID
  created_at: string;         // ISO 8601 timestamp
  updated_at: string;         // ISO 8601 timestamp
}
```

---

### Driver Licence

```typescript
interface IDriverLicence {
  id: string;                 // UUID
  surname: string;            // Surname on licence (max 100 chars)
  initials: string;           // Initials (max 20 chars)
  id_number: string;          // SA ID number (13 digits)
  expiry_date: string;        // YYYY-MM-DD format
  licence_number?: string;    // Driver licence number (max 50 chars, optional)
  licence_codes?: string[];   // Array of licence codes (e.g., ["Code B", "Code C"], optional)
  issue_date?: string;        // YYYY-MM-DD format (optional)
  date_of_birth?: string;     // YYYY-MM-DD format (optional)
  gender?: string;            // Gender (max 10 chars, optional)
  decoded_data?: object;      // Additional decoded data (JSON object, optional)
  profile_id: string;         // User UUID
  created_at: string;         // ISO 8601 timestamp
  updated_at: string;         // ISO 8601 timestamp
}
```

---

### PSIRA Officer

```typescript
interface IPsiraOfficer {
  id: string;                 // UUID
  id_number: string;          // SA ID number
  name: string;               // Officer name
  grade?: string;             // PSIRA grade (optional)
  expiry_date: string;        // YYYY-MM-DD format
  registration_status?: string;// e.g., "Active" (optional)
  profile_id: string;         // User UUID
  created_at: string;         // ISO 8601 timestamp
  updated_at: string;         // ISO 8601 timestamp
}
```

---

### Subscription

```typescript
interface ISubscription {
  id: string;                 // UUID
  profile_id: string;         // User UUID
  package_id: string;         // Package UUID
  start_date: string;         // YYYY-MM-DD format
  end_date: string;           // YYYY-MM-DD format
  status: 'active' | 'expired' | 'cancelled' | 'refunded';
  payment_reference?: string; // Payment reference (optional)
  created_at: string;         // ISO 8601 timestamp
  updated_at: string;         // ISO 8601 timestamp
  package?: IPackage;         // Related package (when populated)
}
```

---

### Package

```typescript
interface IPackage {
  id: string;                 // UUID
  package_name: string;       // e.g., "Basic Monthly"
  slug: string;               // URL-friendly slug
  type: 'monthly' | 'yearly'; // Billing cycle
  price: number;              // Price in ZAR
  description?: string;       // Package description (optional)
  is_active: boolean;         // Active status
  permission_id: string;      // Permission set UUID
  created_at: string;         // ISO 8601 timestamp
  updated_at: string;         // ISO 8601 timestamp
  permissions?: IPermission;  // Related permissions (when populated)
}
```

---

### Permission

```typescript
interface IPermission {
  id: string;                 // UUID
  psira_access: boolean;      // Access to PSIRA officers
  firearm_access: boolean;    // Access to firearms
  vehicle_access: boolean;    // Access to vehicles
  certificate_access: boolean;// Access to certificates
  drivers_access: boolean;    // Access to driver licences
  created_at: string;         // ISO 8601 timestamp
  updated_at: string;         // ISO 8601 timestamp
}
```

---

### Reminder Setting

```typescript
interface IReminderSetting {
  id: string;                 // UUID
  profile_id: string;         // User UUID
  entity_type: 'firearms' | 'vehicles' | 'certificates' | 'psira_officers';
  days_before: number;        // Days before expiry (1-365)
  is_enabled: boolean;        // Enable/disable reminder
  created_at: string;         // ISO 8601 timestamp
  updated_at: string;         // ISO 8601 timestamp
}
```

---

### User Profile

```typescript
interface IProfile {
  id: string;                 // UUID
  email: string;              // Email address
  phone: string;              // Phone number (E.164 format)
  role: 'User' | 'Admin';     // User role
  created_at: string;         // ISO 8601 timestamp
}
```

---

## Webhooks Integration

### Paystack Webhook

The API receives webhook events from Paystack to handle payment notifications automatically.

#### Webhook URL

**Endpoint:** `POST /webhooks/paystack`
**URL:** `https://your-production-domain.com/api/v1/webhooks/paystack`

#### Security

Paystack signs webhook requests using HMAC SHA512. The signature is in the `x-paystack-signature` header.

**Verification:**
```javascript
const crypto = require('crypto');

function verifyPaystackSignature(payload, signature) {
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(payload))
    .digest('hex');

  return hash === signature;
}
```

#### Supported Events

| Event                  | Description                              | Action                          |
|------------------------|------------------------------------------|---------------------------------|
| `charge.success`       | Payment completed successfully           | Activate subscription           |
| `subscription.disable` | Subscription cancelled by Paystack       | Update subscription status      |
| `refund.processed`     | Refund completed                         | Mark subscription as refunded   |

#### Webhook Payload Example

```json
{
  "event": "charge.success",
  "data": {
    "id": 123456789,
    "domain": "live",
    "status": "success",
    "reference": "REF_123456789",
    "amount": 9900,
    "currency": "ZAR",
    "customer": {
      "email": "user@example.com",
      "id": 12345
    },
    "metadata": {
      "profile_id": "550e8400-e29b-41d4-a716-446655440000",
      "package_id": "660e8400-e29b-41d4-a716-446655440111"
    }
  }
}
```

#### Configure Webhook in Paystack

1. Log in to your Paystack Dashboard
2. Go to Settings → Webhooks
3. Add webhook URL: `https://your-domain.com/api/v1/webhooks/paystack`
4. Save and copy the webhook secret

---

## Appendix

### Environment Variables

Required environment variables for the API:

```bash
# Application
PORT=8080
NODE_ENV=development
API_VERSION=v1

# Database
DATABASE_URL=postgresql://user:password@host:port/database
DATABASE_MAX_CONNECTIONS=10
DATABASE_IDLE_TIMEOUT=20
DATABASE_CONNECT_TIMEOUT=10

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Paystack
PAYSTACK_SECRET=your-paystack-secret-key

# Email (Klaviyo)
KLAVIYO_PRIVATE_API_KEY=your-klaviyo-api-key
KLAVIYO_API_REVISION=2024-10-15
SUPPORT_EMAIL=support@firearmstudio.com

# CORS (optional - comma-separated)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Rate Limits

- **Window:** 15 minutes
- **Limit:** 100 requests per window per IP address
- **Applies to:** All endpoints

### Date Formats

All dates in the API use ISO 8601 format:

- **Date Only:** `YYYY-MM-DD` (e.g., `2026-02-15`)
- **Date-Time:** ISO 8601 with timezone (e.g., `2026-02-15T10:30:00.000Z`)

### Pagination Limits

- **Default:** 20 items per page
- **Maximum:** 100 items per page
- **Cursor:** Base64-encoded JSON containing `created_at` and `id`

### Subscription Refund Policy

- Refunds are available within **7 days** of purchase
- Request via `POST /subscriptions/me/:id/refund`
- Refunds are processed through Paystack

### Support

**Email:** support@firearmstudio.com
**API Documentation:** `/api/docs`
**Status Page:** Check `/health` endpoint

---

**End of Documentation**
