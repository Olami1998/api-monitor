1. Security Overview

The platform allows users to configure URLs that our infrastructure will request.

That creates a major security risk:

SSRF (Server-Side Request Forgery)

A malicious user could potentially configure:

http://localhost:3000
http://127.0.0.1
http://169.254.169.254
http://10.0.0.1

and attempt to access internal services or cloud metadata.

Therefore, outbound request security is a first-class feature of the architecture.

2. Security Goals

The system must protect:

User accounts
API credentials
Monitored API data
Internal infrastructure
Database
Redis
Worker infrastructure
Notification systems
Other users' data
3. Threat Model

Primary threats:

1. SSRF

User attempts to make the monitoring worker access internal infrastructure.

2. Credential exposure

API keys, tokens, or passwords appear in:

Logs
Database dumps
Error messages
Notifications
Browser responses
3. Broken authorization

User A accesses User B's monitors.

4. Abuse of monitoring infrastructure

Someone uses the service to:

Scan external systems
Send excessive requests
Perform denial-of-service activity
Proxy arbitrary traffic
5. Malicious API responses

A monitored API returns:

Extremely large responses
Unexpected content
Malicious payloads
Slow/infinite responses
6. Authentication attacks
Brute-force login
Credential stuffing
Session theft
Password attacks
4. SSRF Protection

This is the most important security requirement.

Before any outbound request:

User URL
   ↓
Parse URL
   ↓
Validate protocol
   ↓
Resolve hostname
   ↓
Inspect resolved IP
   ↓
Block restricted ranges
   ↓
Apply request limits
   ↓
Execute request
5. Allowed Protocols

MVP supports only:

http://
https://

Block:

file://
ftp://
gopher://
data://
javascript:
ssh://
6. Blocked IP Ranges

The worker must reject private/internal addresses.

Examples:

127.0.0.0/8
10.0.0.0/8
172.16.0.0/12
192.168.0.0/16
169.254.0.0/16
100.64.0.0/10
224.0.0.0/4
0.0.0.0/8

Also block IPv6 internal/link-local ranges.

7. DNS Rebinding Protection

A simple check of the hostname is insufficient.

Example:

evil.example.com

could initially resolve to a public IP and later resolve to:

127.0.0.1

The worker must validate the resolved destination IP immediately before connection.

Redirects must also be checked.

8. Redirect Protection

A monitored endpoint may respond:

302 → http://internal-service

The worker must not blindly follow it.

For every redirect:

Redirect URL
     ↓
Validate URL
     ↓
Resolve host
     ↓
Validate IP
     ↓
Follow only if safe

MVP could also use a conservative redirect limit:

Maximum redirects: 5
9. Request Timeout

Every outbound request must have a timeout.

Example:

Default: 5 seconds
Maximum: 30 seconds

A user must not be able to configure an unlimited timeout.

10. Response Size Limits

Never allow unlimited response bodies.

Example MVP:

Maximum response size: 1 MB

If the response exceeds the limit:

ERROR
Response exceeded maximum allowed size.

The connection should be terminated safely.

11. Request Body Limits

Users should not be allowed to send enormous request bodies.

Example:

Maximum request body: 1 MB

This protects the worker from memory abuse.

12. Authentication Security

Passwords must never be stored directly.

Store:

password_hash

Use a strong password hashing algorithm such as:

Argon2id

13. Session Security

Authentication sessions should use:

HttpOnly
Secure
SameSite=Lax

Session expiration should be enforced.

Logout must invalidate the session.

14. Credential Storage

Monitor credentials must be encrypted before being stored.

Example:

User enters API key
       ↓
Application encrypts it
       ↓
PostgreSQL stores ciphertext

Never:

api_key = "sk_live_123456"

in the database.

15. Credential Redaction

Credentials must be removed from logs.

Example:

Authorization: Bearer [REDACTED]
X-API-Key: [REDACTED]
Cookie: [REDACTED]

This applies to:

Application logs
Worker logs
Error logs
Incident details
Notifications
16. API Authorization

Every resource request must verify ownership.

Bad:

GET /api/monitors/:id

and simply return the monitor.

Correct:

Authenticated user
      ↓
Monitor
      ↓
Project
      ↓
Project owner
      ↓
Allow / Deny

Never trust a userId supplied by the client.

17. Rate Limiting

Rate-limit:

Authentication
Login
Register
Password reset
Manual test execution
POST /monitors/:id/run
API requests

Prevent users from overwhelming the backend.

18. Monitoring Abuse

The product could potentially be abused as an HTTP request platform.

Therefore:

Per-user limits

Example MVP:

Maximum monitors: 50
Maximum executions: 10/minute manually
Maximum scheduled frequency: 1 minute

These should be configurable server-side.

19. Queue Security

Redis should never be publicly accessible.

Only:

Next.js
Worker

should access the Redis instance.

Redis authentication should be enabled where supported.

20. Database Security

PostgreSQL should not be publicly exposed.

Only application services should access it.

Use:

Strong database password
Private network
Encrypted connections where appropriate
Least-privilege database user
21. Database Access

The application should not use a PostgreSQL superuser.

Create a dedicated application database user with only the required permissions.

22. Environment Variables

Secrets belong in environment variables or a proper secret manager.

Example:

DATABASE_URL=
REDIS_URL=
SESSION_SECRET=
ENCRYPTION_KEY=
EMAIL_API_KEY=

Never commit:

.env
.env.production

to Git.

Commit:

.env.example

instead.

23. Input Validation

Every external input must be validated.

Use:

Zod

Validate:

URLs
HTTP methods
Headers
Query parameters
Request bodies
Assertion definitions
Schedule values
Project names
24. URL Validation

Before saving a monitor:

Parse URL
 ↓
Require HTTP/HTTPS
 ↓
Require valid hostname
 ↓
Reject credentials embedded in URL
 ↓
Reject localhost
 ↓
Reject obvious private IPs

However, URL validation at creation time is not sufficient.

The worker must repeat network-level validation during execution.

25. CORS

The API should only permit requests from the official application frontend.

Do not use:

Access-Control-Allow-Origin: *

for authenticated application endpoints.

26. CSRF

Because authentication uses cookies, state-changing requests need CSRF protection where applicable.

Using:

SameSite cookies
Origin/Referer validation
CSRF tokens where needed

provides layered protection.

27. XSS Protection

User-controlled values such as:

Monitor names
Project names
Error messages
API responses

must never be inserted into HTML unsafely.

React's default escaping should be preserved.

Avoid unnecessary use of:

dangerouslySetInnerHTML
28. API Response Security

Never return:

Password hashes
Encryption keys
Session secrets
Raw credentials
Internal stack traces

Production errors should be generic:

Something went wrong.

Detailed errors belong in internal logs.

29. Logging

Logs should contain enough information to troubleshoot problems without exposing secrets.

Good:

Monitor: 91b...
Status: 500
Duration: 823ms

Bad:

Authorization: Bearer abc123...
30. Audit Logging

Not required for MVP.

Later, record security-sensitive actions:

User logged in
Monitor created
Monitor deleted
Credential updated
Project deleted

This becomes important once teams and multiple users are introduced.

31. Worker Isolation

The worker should run with minimal operating-system privileges.

Docker container:

Non-root user
Read-only filesystem where practical
Limited CPU
Limited memory
No unnecessary Linux capabilities

This is especially important because the worker processes untrusted external responses.

32. Container Security

Containers should:

Run as non-root
Use minimal base images
Avoid privileged mode
Avoid host networking
Avoid mounting the Docker socket
Have resource limits

Never give the monitoring worker access to:

/var/run/docker.sock

There is no reason for it.

33. Network Isolation

Recommended architecture:

                Internet
                   │
                   ▼
               Web App
                   │
             ┌─────┴─────┐
             ▼           ▼
          Redis       PostgreSQL
             │
             ▼
           Worker
             │
             ▼
        External APIs

The worker requires outbound internet access.

It should not have unrestricted access to internal services.

34. Dependency Security

Use:

Dependabot/Renovate
npm audit
Regular dependency updates
Lockfiles

Never blindly update production dependencies without testing.

35. Backup Strategy

PostgreSQL backups should eventually include:

Automated daily backups
Retention period
Restore testing

A backup that has never been restored is only an assumption.

36. Security Testing

Before production launch, test:

SSRF

Attempt:

localhost
127.0.0.1
169.254.169.254
10.x.x.x
192.168.x.x
IPv6 localhost
DNS rebinding
Redirect to private IP
Authentication

Test:

Brute force
Invalid sessions
Expired sessions
Session fixation
Authorization

Attempt:

User A → User B's monitor
User A → User B's project

Every attempt should fail.

37. MVP Security Checklist

Before production:

 SSRF protection implemented
 Redirect validation implemented
 DNS/IP validation implemented
 Request timeout enforced
 Response size limited
 Request body limited
 Credentials encrypted
 Credential redaction implemented
 Passwords hashed with Argon2id
 Secure HTTP-only sessions
 Resource ownership checks
 API rate limiting
 Redis private
 PostgreSQL private
 Worker runs as non-root
 Containers have resource limits
 Secrets excluded from Git
 Production error responses sanitized
 Dependency scanning configured
 SSRF tests passing
 Authorization tests passing
38. Security Principle

The most important rule for this product is:

Never trust the URL, request, credentials, headers, body, or response provided by a user or external API.

The monitoring worker sits between the internet and our infrastructure.

That makes the worker the highest-risk component of the system.

We should design it as if every monitored API could be malicious.

Current project foundation

At this point we have:

01 Product Definition     ✅
02 PRD                    ✅
03 Architecture           ✅
04 Database Design        ✅
05 API Specification     ✅
06 UI/UX                  ✅
07 Security               ✅