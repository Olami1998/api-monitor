1. Testing Goal

The goal isn't simply to prove that the UI works.

We need to prove that:

A monitor executes correctly.
Assertions detect real API failures.
Scheduled checks run reliably.
Incidents are created and resolved correctly.
Notifications work.
Users cannot access other users' data.
The monitoring worker cannot be abused to attack internal infrastructure.
The system behaves correctly when external APIs are slow, broken, or malicious.
2. Testing Strategy

We'll use four levels:

Unit Tests
    ↓
Integration Tests
    ↓
End-to-End Tests
    ↓
Security / Failure Tests

Each level catches different problems.

3. Testing Stack

I'd use:

Unit / Integration

Vitest

API / HTTP mocking

MSW

End-to-End

Playwright

Database

PostgreSQL test database

Queue

Redis test instance

CI

GitHub Actions

4. Unit Testing

Unit tests should cover isolated business logic.

Important modules:

src/
├── lib/
│   ├── url-validator
│   ├── ssrf-protection
│   ├── assertions
│   ├── incident-engine
│   ├── scheduler
│   ├── encryption
│   └── redaction
5. URL Validation Tests

Test valid URLs:

https://example.com
http://example.com
https://api.example.com/users

Reject:

localhost
127.0.0.1
http://127.0.0.1
http://10.0.0.1
http://192.168.1.1
http://169.254.169.254
file:///etc/passwd
ftp://example.com
6. SSRF Tests

This deserves extensive testing.

Test:
http://localhost
http://127.0.0.1
http://127.0.0.2
http://10.0.0.1
http://172.16.0.1
http://192.168.0.1
http://169.254.169.254

Expected:

BLOCKED
7. DNS Rebinding Tests

Simulate:

evil.example.com
       ↓
Public IP
       ↓
Private IP

Expected:

BLOCKED

The test must verify that DNS is validated at execution time, not only when the monitor is created.

8. Redirect SSRF Tests

Example:

https://safe.example.com
        ↓
302
        ↓
http://127.0.0.1

Expected:

BLOCKED

Also test:

safe
 ↓
safe
 ↓
safe
 ↓
safe
 ↓
safe
 ↓
safe

Expected:

REDIRECT_LIMIT_EXCEEDED
9. Assertion Engine Tests

The assertion engine is one of the most important pieces of business logic.

Status code
Expected: 200
Actual:   200
Result:   PASS
Expected: 200
Actual:   500
Result:   FAIL
10. Response Time Assertions
Expected < 500ms
Actual 200ms
PASS
Expected < 500ms
Actual 700ms
FAIL

Test boundary conditions:

Expected < 500
Actual = 500

This must behave according to the defined operator semantics.

11. JSON Assertions

Test:

$.data.id

against:

{
  "data": {
    "id": 123
  }
}

Expected:

PASS

Missing path:

$.data.email

Expected:

FAIL
12. JSON Type Assertions

Test:

$.data.email
type = string

Response:

{
  "data": {
    "email": "user@example.com"
  }
}

Expected:

PASS

Response:

{
  "data": {
    "email": 123
  }
}

Expected:

FAIL
13. Assertion Edge Cases

Test:

null
undefined
empty string
0
false
empty array
empty object
nested objects
nested arrays

The assertion engine must not confuse:

false

with:

missing

This is a common source of bugs.

14. Incident Engine Tests

The incident engine determines when a failure becomes an incident.

Example:

PASS
PASS
FAIL

Expected:

Incident created

Next:

FAIL
FAIL
FAIL

Expected:

Same incident

Not:

3 incidents
15. Incident Resolution

Example:

FAIL
FAIL
FAIL
PASS

Expected:

Incident:
OPEN → RESOLVED

The system should record:

started_at
resolved_at
duration
16. Incident Recovery

Test:

FAIL
PASS
FAIL

Expected:

Incident 1 → RESOLVED

Incident 2 → OPEN

The second failure should create a new incident.

17. Worker Tests

Test the complete worker lifecycle:

Queue Job
   ↓
Worker receives job
   ↓
Load monitor
   ↓
Execute request
   ↓
Run assertions
   ↓
Save result
   ↓
Update monitor

Expected:

TestRun = PASSED

for a healthy endpoint.

18. Worker Failure Tests

Test:

Connection refused
DNS failure
Timeout
TLS failure
HTTP 400
HTTP 401
HTTP 403
HTTP 404
HTTP 429
HTTP 500
HTTP 502
HTTP 503

Each should produce a predictable result.

19. Timeout Test

Create a test endpoint that deliberately sleeps.

Example:

/api/test/slow

Configure:

timeout = 2 seconds

Endpoint:

sleep = 5 seconds

Expected:

TIMEOUT

The worker must terminate the request.

20. Large Response Test

Create a test endpoint that returns a response larger than the allowed limit.

Expected:

RESPONSE_TOO_LARGE

The worker must not consume unlimited memory.

21. Large Request Test

Attempt to create a monitor with:

10 MB request body

Expected:

VALIDATION_ERROR
22. Scheduler Tests

Test:

Monitor enabled
nextRunAt <= current time

Expected:

Job queued

Test:

Monitor disabled

Expected:

No job queued
23. Duplicate Job Protection

This is important.

Imagine the scheduler runs twice simultaneously.

Without protection:

Monitor
 ↓
Job A
Job B
Job C

The same monitor could execute multiple times.

Expected:

Only one scheduled execution

when the jobs represent the same scheduled interval.

24. API Tests

Test every endpoint.

For example:

POST /projects
GET /projects
PATCH /projects/:id
DELETE /projects/:id

Expected:

Correct status code
Correct response
Correct database changes
Correct authorization
25. Authentication Tests

Test:

Registration
Valid email + password
→ account created
Duplicate email
Existing email
→ 409 Conflict
Login
Correct credentials
→ authenticated
Incorrect password
Wrong password
→ 401
26. Authorization Tests

This is mandatory.

Create:

User A
User B

User A owns:

Project A
Monitor A

User B owns:

Project B
Monitor B

Attempt:

User A → Monitor B
User A → Project B
User B → Monitor A
User B → Project A

Expected:

403 / 404

depending on our chosen resource-enumeration policy.

27. Credential Security Tests

Create a monitor using:

Bearer secret-token

Verify:

Database

Token is encrypted.

API response

Token isn't returned.

Logs

Token isn't present.

Error response

Token isn't present.

This test should be automated.

28. Authentication Session Tests

Test:

Login
 ↓
Session created
 ↓
Authenticated request
 ↓
Logout
 ↓
Authenticated request

Expected:

After logout → 401
29. Rate Limit Tests

Send repeated requests:

POST /api/monitors/:id/run

beyond the allowed limit.

Expected:

429 Too Many Requests
30. End-to-End Test

Our most important E2E test:

Register
 ↓
Create Project
 ↓
Create Monitor
 ↓
Add Assertion
 ↓
Run Test
 ↓
Test passes
 ↓
View result

This verifies the entire product loop.

31. Failure E2E Test

Second critical E2E test:

Create Monitor
 ↓
Run test
 ↓
API returns 500
 ↓
Test fails
 ↓
Incident created
 ↓
Incident appears on dashboard
32. Recovery E2E Test
API failing
 ↓
Incident created
 ↓
API becomes healthy
 ↓
Monitor executes
 ↓
Test passes
 ↓
Incident resolved
33. Notification E2E Test
Monitor fails
 ↓
Incident created
 ↓
Notification queued
 ↓
Notification sent

Verify:

notification.status = SENT

For development, use a test email provider or local email capture rather than sending real emails.

34. UI Testing

Playwright should test important user interactions.

Dashboard

Verify:

Monitor counts
Health states
Recent incidents
Navigation
Monitor creation

Verify:

Form validation
Authentication configuration
Assertions
Save
Monitor details

Verify:

Health status
Test history
Assertions
Manual test
Incident

Verify:

Failure reason
Timeline
Resolution
35. Accessibility Testing

Every important page should be tested for:

Keyboard navigation
Focus states
Form labels
Screen-reader labels
Color contrast
Status indicators that don't rely solely on color

For example:

Bad:

🔴

Better:

🔴 Failing
36. Performance Testing

We don't need serious load testing on day one.

But we should test:

API
100 concurrent requests
Worker
100 queued monitor jobs
Database

Test large test_runs queries.

Especially:

Get latest 100 runs

must remain fast.

37. Load Testing

Later use:

k6

Test scenarios:

10 users
100 users
1,000 users

Don't optimize for 1,000,000 users before we have 10.

38. Database Testing

Test:

Foreign keys
Cascading deletes
Unique constraints
Required fields
Index behavior
Transaction behavior

Important scenario:

Delete Project

Verify all dependent records are correctly handled.

39. Queue Testing

Test:

Job created
Job processed
Job succeeds
Job fails
Job retries
Job permanently fails

Also test worker restart:

Job queued
 ↓
Worker crashes
 ↓
Worker restarts
 ↓
Job processed

The system should not silently lose jobs.

40. Retry Testing

Not every failure should be retried.

Retry
Network timeout
Temporary connection failure
503
502
Don't blindly retry
400
401
403
404

Otherwise the system could generate unnecessary traffic against an already-failing API.

41. Security Test Matrix

Before launch:

Attack	Expected
localhost URL	Block
Private IP	Block
Cloud metadata IP	Block
DNS rebinding	Block
Redirect to private IP	Block
Huge response	Block
Huge request	Block
Excessive manual runs	Rate limited
User A accessing User B	Denied
Credential exposure	Never exposed
Invalid session	Denied
42. Test Environments

We should have:

Development
    ↓
Test
    ↓
Production
Development

Local machine.

Test

Automated CI environment.

Production

Real users.

Never run destructive tests against production.

43. Test Data

Create deterministic test APIs.

Instead of depending on random public APIs, create an internal test service:

/test-api
├── /success
├── /failure
├── /slow
├── /redirect
├── /large-response
├── /json
├── /auth
└── /rate-limit

This makes testing reproducible.

44. CI Pipeline

Every pull request should run:

Git Push
   ↓
Lint
   ↓
TypeScript Check
   ↓
Unit Tests
   ↓
Integration Tests
   ↓
Build
   ↓
E2E Tests

If any critical step fails:

❌ Pull Request
45. GitHub Actions

Eventually:

.github/
└── workflows/
    ├── test.yml
    └── deploy.yml
test.yml

Runs:

npm install
lint
typecheck
unit tests
integration tests
build
E2E
46. Test Coverage

Don't chase 100% coverage.

Instead, prioritize business-critical code.

Target roughly:

Assertion engine       90%+
SSRF protection        90%+
Incident engine        90%+
Authentication         80%+
API                    80%+
UI                     Critical paths

A meaningless 100% coverage number is worse than 80% meaningful coverage.

47. Definition of Done

A feature isn't done when:

"The UI works."

It's done when:

Implementation
      +
Validation
      +
Authorization
      +
Unit tests
      +
Integration tests
      +
E2E where appropriate
      +
Error handling

are complete.

48. MVP Test Checklist
Authentication
 Registration
 Login
 Logout
 Invalid credentials
 Session expiration
 Rate limiting
Projects
 Create
 Read
 Update
 Delete
 Ownership
Monitors
 Create
 Update
 Delete
 Pause
 Resume
 Manual execution
Assertions
 Status code
 Response time
 JSON path
 JSON type
 Missing values
 Edge cases
Worker
 Successful request
 Failed request
 Timeout
 DNS failure
 Large response
 Retry
Incidents
 Create
 Maintain same incident during continuous failure
 Resolve
 Create new incident after recovery + new failure
Security
 SSRF
 DNS rebinding
 Redirect SSRF
 Authorization
 Credential encryption
 Credential redaction
 Rate limiting
Notifications
 Queue
 Send
 Failure
Retry
E2E
 Complete happy path
 Complete failure path
 Complete recovery path
49. The Three Tests I Care About Most

If we had to prove the MVP with only three tests, I'd choose:

Test 1: Happy path
User
 ↓
Project
 ↓
Monitor
 ↓
Assertion
 ↓
API request
 ↓
PASS
Test 2: Failure path
API changes
 ↓
Assertion fails
 ↓
Incident created
 ↓
User sees exactly why
Test 3: Security path
Malicious user
 ↓
Attempts SSRF
 ↓
Worker blocks request
 ↓
Internal infrastructure remains unreachable

If those three work reliably, we have the beginnings of a genuinely credible monitoring product.