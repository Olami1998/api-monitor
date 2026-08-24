API Overview

The API is the communication layer between the web application and the backend services.

It handles:

Authentication
Projects
Monitors
Assertions
Test execution
Test results
Incidents
Notifications
Dashboard data
Base URL

Development:

http://localhost:3000/api

Production:

https://app.example.com/api

The production domain will be replaced once the product is named.

2. API Design Principles

The API should follow:

RESTful resource naming
JSON request/response bodies
Consistent error responses
Authentication on protected endpoints
Server-side validation
Pagination for large datasets
Rate limiting
No sensitive credentials in responses
3. Authentication

For MVP:

Authentication method

HTTP-only session cookie.

The browser authenticates through the web application.

We should not store authentication tokens in localStorage.

4. Authentication Endpoints
POST /api/auth/register

Create a new account.

Request
{
  "name": "Olalekan",
  "email": "user@example.com",
  "password": "secure-password"
}
Response
{
  "user": {
    "id": "uuid",
    "name": "Olalekan",
    "email": "user@example.com"
  }
}
POST /api/auth/login

Authenticate a user.

Request
{
  "email": "user@example.com",
  "password": "secure-password"
}
Response
{
  "user": {
    "id": "uuid",
    "name": "Olalekan",
    "email": "user@example.com"
  }
}

The server creates the authenticated session.

POST /api/auth/logout

End the current session.

Response
{
  "success": true
}
GET /api/auth/me

Return the currently authenticated user.

Response
{
  "id": "uuid",
  "name": "Olalekan",
  "email": "user@example.com"
}
5. Projects API
GET /api/projects

Return projects belonging to the authenticated user.

Response
{
  "data": [
    {
      "id": "uuid",
      "name": "My SaaS API",
      "description": "Production API",
      "monitorCount": 12
    }
  ]
}
POST /api/projects

Create a project.

Request
{
  "name": "My SaaS API",
  "description": "Production API"
}
Response
{
  "id": "uuid",
  "name": "My SaaS API",
  "description": "Production API"
}
GET /api/projects/:projectId

Return project details.

PATCH /api/projects/:projectId

Update project information.

Request
{
  "name": "Production API"
}
DELETE /api/projects/:projectId

Delete a project and its associated resources.

This action should require confirmation in the UI.

6. Monitors API
GET /api/projects/:projectId/monitors

Return monitors belonging to a project.

Response
{
  "data": [
    {
      "id": "uuid",
      "name": "Get Users",
      "method": "GET",
      "url": "https://api.example.com/users",
      "status": "HEALTHY",
      "enabled": true,
      "lastRunAt": "2026-08-24T02:30:00Z",
      "nextRunAt": "2026-08-24T02:35:00Z"
    }
  ]
}
7. Create Monitor
POST /api/projects/:projectId/monitors
Request
{
  "name": "Get Users",
  "method": "GET",
  "url": "https://api.example.com/users",
  "timeoutMs": 5000,
  "intervalSeconds": 300,
  "enabled": true
}
Response
{
  "id": "uuid",
  "name": "Get Users",
  "method": "GET",
  "url": "https://api.example.com/users",
  "timeoutMs": 5000,
  "intervalSeconds": 300,
  "enabled": true,
  "status": "PAUSED"
}

A newly created monitor should not necessarily execute immediately unless the user explicitly chooses Run Test.

8. Get Monitor
GET /api/monitors/:monitorId

Returns complete monitor configuration.

Sensitive credentials must be excluded.

Response
{
  "id": "uuid",
  "name": "Get Users",
  "method": "GET",
  "url": "https://api.example.com/users",
  "timeoutMs": 5000,
  "intervalSeconds": 300,
  "enabled": true,
  "status": "HEALTHY",
  "request": {
    "headers": {
      "Content-Type": "application/json"
    },
    "queryParams": {}
  },
  "authentication": {
    "type": "BEARER",
    "configured": true
  },
  "assertions": []
}

Notice:

token: ********

is never returned.

9. Update Monitor
PATCH /api/monitors/:monitorId
Request
{
  "name": "Get Production Users",
  "timeoutMs": 3000,
  "enabled": true
}

Only supplied fields are modified.

10. Delete Monitor
DELETE /api/monitors/:monitorId

Deletes the monitor and its associated configuration.

11. Request Configuration
PUT /api/monitors/:monitorId/request
Request
{
  "headers": {
    "Content-Type": "application/json",
    "Accept": "application/json"
  },
  "queryParams": {
    "page": "1"
  },
  "body": {
    "name": "Test User"
  }
}
12. Authentication Configuration
PUT /api/monitors/:monitorId/auth
Request

Bearer token:

{
  "type": "BEARER",
  "token": "secret-token"
}

API key:

{
  "type": "API_KEY",
  "key": "X-API-Key",
  "value": "secret-key"
}

Basic authentication:

{
  "type": "BASIC",
  "username": "user",
  "password": "secret"
}

The backend encrypts credentials before storing them.

13. Assertions API
POST /api/monitors/:monitorId/assertions
Request
{
  "type": "STATUS_CODE",
  "operator": "EQUALS",
  "expectedValue": 200
}

JSON example:

{
  "type": "JSON",
  "path": "$.data.email",
  "operator": "TYPE_IS",
  "expectedValue": "string"
}
PATCH /api/assertions/:assertionId

Update an assertion.

DELETE /api/assertions/:assertionId

Delete an assertion.

14. Run Monitor
POST /api/monitors/:monitorId/run

Manually trigger a monitor.

The API should not execute the HTTP request itself.

Instead:

POST /run
    ↓
Validate request
    ↓
Create job
    ↓
Redis/BullMQ
    ↓
Worker
Response
{
  "jobId": "uuid",
  "status": "QUEUED"
}

This is an important architectural boundary.

15. Test Runs
GET /api/monitors/:monitorId/runs

Returns test history.

Query parameters
?page=1
&limit=50
&status=FAILED
Response
{
  "data": [
    {
      "id": "uuid",
      "status": "PASSED",
      "httpStatus": 200,
      "durationMs": 184,
      "startedAt": "2026-08-24T02:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 324
  }
}
16. Test Run Details
GET /api/runs/:runId

Returns detailed execution information.

Response
{
  "id": "uuid",
  "status": "FAILED",
  "httpStatus": 200,
  "durationMs": 742,
  "startedAt": "2026-08-24T02:30:00Z",
  "completedAt": "2026-08-24T02:30:01Z",
  "assertions": [
    {
      "type": "RESPONSE_TIME",
      "expected": "< 500",
      "actual": 742,
      "passed": false
    }
  ]
}
17. Incidents API
GET /api/monitors/:monitorId/incidents

Return incidents for a monitor.

Query
?status=OPEN
GET /api/incidents/:incidentId

Return incident details.

Response
{
  "id": "uuid",
  "status": "OPEN",
  "startedAt": "2026-08-24T02:15:00Z",
  "resolvedAt": null,
  "failureReason": "Expected HTTP 200 but received 500"
}
18. Notifications
GET /api/notifications

Return recent notification events.

19. Dashboard API

Rather than making the dashboard perform 10 separate API requests, we should provide a dashboard summary endpoint.

GET /api/dashboard
Response
{
  "summary": {
    "totalMonitors": 12,
    "healthy": 10,
    "degraded": 1,
    "failing": 1
  },
  "recentIncidents": [],
  "recentRuns": [],
  "performance": {
    "averageResponseTimeMs": 238
  }
}

This makes the dashboard much simpler.

20. Error Format

All API errors should follow the same structure.

Example
{
  "error": {
    "code": "MONITOR_NOT_FOUND",
    "message": "Monitor could not be found."
  }
}
21. Common Error Codes
UNAUTHORIZED
FORBIDDEN
VALIDATION_ERROR
NOT_FOUND
CONFLICT
RATE_LIMITED
INTERNAL_ERROR
MONITOR_NOT_FOUND
PROJECT_NOT_FOUND
INVALID_URL
INVALID_ASSERTION
TEST_EXECUTION_FAILED
22. HTTP Status Codes

Use standard HTTP semantics.

200 OK
201 Created
202 Accepted
204 No Content

400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
429 Too Many Requests
500 Internal Server Error

202 Accepted is particularly important for asynchronous operations such as manually triggering a test.

23. Validation

Every incoming request must be validated server-side.

I'd use:

Zod

Example:

CreateMonitorSchema
UpdateMonitorSchema
AssertionSchema
AuthenticationSchema

Never trust frontend validation alone.

24. Authorization

Every protected resource must verify ownership.

For example:

GET /api/monitors/123

must verify:

monitor.project.userId === authenticatedUser.id

Do not rely on the frontend to prevent users from accessing another user's monitor.

25. Rate Limiting

Rate limits should apply to:

Authentication

Strict limits.

Manual test execution

Prevent abuse.

API endpoints

Prevent excessive requests.

Example MVP policy:

Manual test:
10 requests/minute/user

The exact limits can be adjusted after testing.

26. Worker Communication

The worker should not expose a public API.

Instead:

Web API
   ↓
Redis Queue
   ↓
Worker
   ↓
PostgreSQL

The worker reads jobs such as:

{
  "type": "RUN_MONITOR",
  "monitorId": "uuid",
  "runId": "uuid"
}
27. Worker Result Flow
Worker receives job
        ↓
Load monitor
        ↓
Execute HTTP request
        ↓
Run assertions
        ↓
Save TestRun
        ↓
Save AssertionResults
        ↓
Evaluate Incident
        ↓
Queue Notification

The worker should not directly communicate with the browser.

28. Internal vs Public APIs

We should distinguish between:

Application API

Used by:

Browser → Next.js

and:

Internal worker operations

Used by:

Queue → Worker

Do not expose internal worker functionality as public endpoints.

29. Future API

Eventually we could expose a developer API:

POST /v1/monitors
GET /v1/monitors
POST /v1/monitors/:id/run
GET /v1/runs

with API keys.

But this is V2, not MVP.

30. API Security Rules

The API must:

Validate all input
Authenticate protected requests
Authorize resource ownership
Rate-limit sensitive endpoints
Sanitize errors
Redact credentials
Prevent SSRF
Never expose password hashes
Never expose API credentials
Never trust client-provided ownership information
API Architecture Summary
                    Browser
                       │
                       ▼
                 Next.js API
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   PostgreSQL       Redis        Auth/Validation
                       │
                       ▼
                    Worker
                       │
                       ▼
                 External API
                       │
                       ▼
                Assertion Engine
                       │
              ┌────────┴────────┐
              ▼                 ▼
         Test Results       Incidents
                                │
                                ▼
                          Notifications