Database Overview
Database

PostgreSQL

ORM

Prisma

Primary goals

The database must:

Store user and project data
Store monitor configurations
Store API assertions
Store test execution history
Track incidents
Track notifications
Support efficient dashboard queries
Scale to a large number of test runs
Protect sensitive credentials
2. Entity Relationship
User
 │
 └──< Project
       │
       └──< Monitor
              │
              ├──< Assertion
              │
              ├──< TestRun
              │      │
              │      └──< AssertionResult
              │
              ├──< Incident
              │      │
              │      └──< Notification
              │
              └──── Authentication
3. users

Stores platform users.

Column	Type	Constraints
id	UUID	PK
name	VARCHAR	NOT NULL
email	VARCHAR	UNIQUE, NOT NULL
password_hash	TEXT	NOT NULL
created_at	TIMESTAMP	NOT NULL
updated_at	TIMESTAMP	NOT NULL
Indexes
UNIQUE(email)
4. projects

Groups monitors belonging to a user.

Column	Type	Constraints
id	UUID	PK
user_id	UUID	FK → users.id
name	VARCHAR	NOT NULL
description	TEXT	NULL
created_at	TIMESTAMP	NOT NULL
updated_at	TIMESTAMP	NOT NULL
Relationships
users 1 → many projects
Index
INDEX(user_id)
5. monitors

The central entity.

Each monitor represents an API endpoint that should be tested.

Column	Type	Constraints
id	UUID	PK
project_id	UUID	FK
name	VARCHAR	NOT NULL
method	ENUM	NOT NULL
url	TEXT	NOT NULL
timeout_ms	INTEGER	NOT NULL
interval_seconds	INTEGER	NOT NULL
enabled	BOOLEAN	DEFAULT true
status	ENUM	NOT NULL
created_at	TIMESTAMP	NOT NULL
updated_at	TIMESTAMP	NOT NULL
last_run_at	TIMESTAMP	NULL
next_run_at	TIMESTAMP	NULL
Method enum
GET
POST
PUT
PATCH
DELETE
Monitor status
HEALTHY
DEGRADED
FAILING
PAUSED
Indexes
INDEX(project_id)
INDEX(next_run_at)
INDEX(enabled)

The next_run_at index is important because the scheduler will repeatedly ask:

Which monitors need to run now?

6. monitor_requests

Stores request configuration.

I would separate this from monitors rather than putting everything into one enormous table.

Column	Type	Constraints
id	UUID	PK
monitor_id	UUID	FK, UNIQUE
headers	JSONB	NULL
query_params	JSONB	NULL
body	JSONB/TEXT	NULL
created_at	TIMESTAMP	NOT NULL
updated_at	TIMESTAMP	NOT NULL
Relationship
Monitor 1 → 1 MonitorRequest
Why JSONB?

Headers and query parameters are naturally key-value structures.

It avoids unnecessary tables such as:

monitor_headers
monitor_query_params

for the MVP.

7. monitor_auth

Stores authentication configuration.

Column	Type	Constraints
id	UUID	PK
monitor_id	UUID	FK, UNIQUE
type	ENUM	NOT NULL
credentials_encrypted	TEXT	NULL
created_at	TIMESTAMP	NOT NULL
updated_at	TIMESTAMP	NOT NULL
Authentication types
NONE
API_KEY
BEARER
BASIC
Security requirement

credentials_encrypted must never contain plaintext credentials.

Encryption/decryption should happen in the application/worker layer.

8. assertions

Defines what the API is expected to do.

Column	Type	Constraints
id	UUID	PK
monitor_id	UUID	FK
type	ENUM	NOT NULL
path	TEXT	NULL
operator	ENUM	NOT NULL
expected_value	JSONB	NULL
created_at	TIMESTAMP	NOT NULL
updated_at	TIMESTAMP	NOT NULL
Assertion types
STATUS_CODE
RESPONSE_TIME
HEADER
JSON
Operators
EQUALS
NOT_EQUALS
EXISTS
NOT_EXISTS
CONTAINS
NOT_CONTAINS
LESS_THAN
LESS_THAN_OR_EQUAL
GREATER_THAN
GREATER_THAN_OR_EQUAL
TYPE_IS

Example:

type:
JSON

path:
$.data.email

operator:
TYPE_IS

expected:
string
9. test_runs

Represents one execution of a monitor.

This will potentially become the largest table in the system.

Column	Type	Constraints
id	UUID	PK
monitor_id	UUID	FK
status	ENUM	NOT NULL
started_at	TIMESTAMP	NOT NULL
completed_at	TIMESTAMP	NULL
duration_ms	INTEGER	NULL
http_status	INTEGER	NULL
error_code	VARCHAR	NULL
error_message	TEXT	NULL
response_size_bytes	INTEGER	NULL
created_at	TIMESTAMP	NOT NULL
Status
QUEUED
RUNNING
PASSED
FAILED
ERROR
TIMEOUT
Indexes
INDEX(monitor_id, created_at)
INDEX(status)
INDEX(created_at)

The combined monitor/time index will be particularly useful for:

Show me the last 100 executions for this monitor.

10. assertion_results

Stores the result of each assertion during a test run.

Column	Type	Constraints
id	UUID	PK
test_run_id	UUID	FK
assertion_id	UUID	FK
passed	BOOLEAN	NOT NULL
expected_value	JSONB	NULL
actual_value	JSONB	NULL
error_message	TEXT	NULL
created_at	TIMESTAMP	NOT NULL
Relationships
TestRun 1 → many AssertionResults

Assertion 1 → many AssertionResults
Indexes
INDEX(test_run_id)
INDEX(assertion_id)
11. incidents

Represents a period of continuous failure.

Column	Type	Constraints
id	UUID	PK
monitor_id	UUID	FK
status	ENUM	NOT NULL
started_at	TIMESTAMP	NOT NULL
resolved_at	TIMESTAMP	NULL
failure_reason	TEXT	NULL
created_at	TIMESTAMP	NOT NULL
updated_at	TIMESTAMP	NOT NULL
Status
OPEN
RESOLVED
Indexes
INDEX(monitor_id)
INDEX(status)
INDEX(started_at)
12. notifications

Records notification events.

Column	Type	Constraints
id	UUID	PK
incident_id	UUID	FK
channel	ENUM	NOT NULL
status	ENUM	NOT NULL
recipient	TEXT	NOT NULL
sent_at	TIMESTAMP	NULL
error_message	TEXT	NULL
created_at	TIMESTAMP	NOT NULL
Channels
EMAIL
WEBHOOK
Status
PENDING
SENT
FAILED
13. Notification Configuration

I would not create this table yet.

For the first MVP, notification configuration can live at the project/user level.

However, once we support:

Different recipients
Multiple webhooks
Per-monitor notifications
Notification rules

we should introduce:

notification_configs

This avoids designing unnecessary complexity now.

14. Enums

Prisma enums should represent stable application states.

Examples:

HttpMethod
MonitorStatus
AuthType
AssertionType
AssertionOperator
TestRunStatus
IncidentStatus
NotificationChannel
NotificationStatus

Avoid creating enums for things that users may need to customize later.

15. Relationships

The primary relationships are:

User
 │
 └── Projects
      │
      └── Monitors
           │
           ├── MonitorRequest
           ├── MonitorAuth
           ├── Assertions
           ├── TestRuns
           │    └── AssertionResults
           │
           └── Incidents
                └── Notifications
16. Delete Behavior

We should avoid orphaned data.

Recommended behavior:

Delete User
    ↓
Delete Projects
    ↓
Delete Monitors
    ↓
Delete Assertions
    ↓
Delete Test Runs
    ↓
Delete Incidents

For MVP, cascading deletes are acceptable.

However, production systems should eventually consider soft deletion for important records.

17. Test Run Retention

This is important because test runs can grow extremely quickly.

We should eventually have configurable retention:

7 days
30 days
90 days
180 days

For MVP:

Keep detailed test runs for 30 days.

Historical aggregate metrics can be retained longer.

18. Response Data Storage

We should not store full API responses for every successful test run.

Instead:

Successful run

Store:

status
duration
HTTP status
response size
assertion results
Failed run

Optionally store limited:

request headers
request body
response headers
response body

with strict size limits.

For example:

Maximum stored response:
1 MB

Anything larger should be truncated.

19. Sensitive Data

Never store these in ordinary logs:

Authorization headers
API keys
Bearer tokens
Passwords
Secrets

Even failed test logs must redact sensitive headers.

Example:

Authorization: [REDACTED]
X-API-Key: [REDACTED]
20. Database Performance Strategy

Initially, standard PostgreSQL indexes are enough.

As volume increases, we can introduce:

Partitioning

Partition test_runs by time.

For example:

test_runs_2026_08
test_runs_2026_09
test_runs_2026_10

But do not implement partitioning on day one.

Premature partitioning will make development and migrations more complicated without providing meaningful benefit at MVP scale.

21. Future Entities

Potential future tables:

teams
team_members
api_keys
notification_configs
deployments
environment_variables
test_suites
test_workflows
regions
monitor_tags
audit_logs
subscriptions
usage_records

These are deliberately excluded from MVP.

22. Database Design Principle

The database should optimize for this workflow:

Monitor
   ↓
Execute
   ↓
Record result
   ↓
Evaluate assertions
   ↓
Detect incident
   ↓
Notify user