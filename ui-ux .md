UI/UX Goal

The interface should make one thing immediately obvious:

Are my APIs behaving correctly, and if not, what went wrong?

The UI should prioritize health, failures, and actionable information over decorative dashboard cards.

2. Design Direction
Visual style
Clean
Technical
Professional
Dense enough for developers
Minimal unnecessary decoration
Strong status indicators
Excellent dark-mode support
Responsive

Think:

Developer tool + monitoring dashboard

not:

Generic SaaS admin panel.

3. Primary Navigation

Desktop:

┌─────────────────────────────────────────────────┐
│ Logo                                            │
├─────────────────────────────────────────────────┤
│                                                 │
│ Overview                                        │
│ Projects                                        │
│                                                 │
│ ─────────────                                   │
│                                                 │
│ Incidents                                       │
│                                                 │
│ Settings                                        │
│                                                 │
│                                                 │
│ User                                            │
└─────────────────────────────────────────────────┘

Top bar:

Project Selector        Search        Notifications     User
4. Pages

MVP pages:

/login
/register

/dashboard

/projects
/projects/:id

/monitors/new
/monitors/:id
/monitors/:id/edit

/runs/:id

/incidents
/incidents/:id

/settings

We don't need dozens of pages.

5. Login
Purpose

Get the user into the application quickly.

              Logo

        Welcome back

        Email
        [________________]

        Password
        [________________]

        [     Sign in     ]

        Forgot password?

        ─────── OR ───────

        Create account

MVP:

Email
Password
Login
Forgot password
Register
6. Onboarding

After registration:

Welcome to [Product]

Let's monitor your first API.

Project name
[________________]

[ Create project ]

Then:

Add your first monitor

Endpoint
[ https://api.example.com/users ]

Method
[ GET ▼ ]

[ Continue ]

Then:

What should we expect?

Status code
[ 200 ]

Response time
[ < 500 ms ]

[ Add monitor ]

The goal is to get the user from registration to their first successful test quickly.

7. Dashboard

This is the most important screen.

Header
Good morning, Olalekan

Here's how your APIs are doing.
Health Summary
┌─────────────┬─────────────┬─────────────┬─────────────┐
│   Monitors  │   Healthy   │  Degraded   │   Failing   │
│     12      │     10      │      1      │      1      │
└─────────────┴─────────────┴─────────────┴─────────────┘

The failing count should be visually prominent.

8. Monitor Health List
API MONITORS

Status    Monitor              Response     Last Check

●         Get Users             184ms        2 min ago
●         Create Order          312ms        2 min ago
⚠         Get Products          821ms        3 min ago
●         Get Profile           205ms        3 min ago
✕         Create Payment       FAILED       1 min ago

Clicking a row opens the monitor.

9. Recent Incidents
RECENT INCIDENTS

🔴 Create Payment
   HTTP 500
   Started 12 minutes ago

🟢 Get Products
   Response time regression
   Resolved 1 hour ago
10. Performance Overview

A simple chart:

Response Time

500ms ┤             ╭──╮
400ms ┤        ╭────╯  ╰──╮
300ms ┤────╮───╯           ╰──
200ms ┤    ╰──────────────────
100ms ┤
      └────────────────────────
        12  14  16  18  20  22

Allow:

24h
7d
30d

Don't overload the dashboard with charts.

11. Project Page
My SaaS API

12 Monitors
10 Healthy
1 Degraded
1 Failing

[ + Add Monitor ]

────────────────────────────

MONITORS

● GET    /users
● GET    /products
⚠ POST   /orders
✕ POST   /payments
12. Create Monitor

This needs to be one of the best-designed workflows in the application.

Step 1: Request
Create Monitor

Name
[ Get Users ]

Method
[ GET ▼ ]

URL
[ https://api.example.com/users ]

Timeout
[ 5000 ] ms
Step 2: Authentication
Authentication

○ None
○ API Key
○ Bearer Token
○ Basic Auth

If Bearer:

Token
[ ••••••••••••••••• ]

🔒 Encrypted and securely stored
Step 3: Request

Tabs:

Headers | Query Params | Body

Example:

Headers

Key                 Value

Content-Type        application/json
Accept              application/json

[ + Add Header ]
13. Assertions Builder

This is a key differentiating interface.

Expected Behavior

┌─────────────────────────────────────────┐
│ Status Code                             │
│ equals                                  │
│ 200                                     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Response Time                           │
│ less than                               │
│ 500 ms                                  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ JSON                                    │
│ $.data.email                            │
│ type is                                 │
│ string                                  │
└─────────────────────────────────────────┘

[ + Add Assertion ]

The interface should make assertions understandable even to someone who isn't an expert in JSONPath.

14. Test Now

Before saving:

[ Run Test ]

The system queues the test.

Show:

Testing endpoint...

✓ Request sent
✓ Response received
✓ Status code
✓ Response time
✓ JSON assertions

Result: PASS

This gives immediate feedback.

15. Monitor Detail

This should be the core screen of the product.

Header:

GET /users

● Healthy

[ Run Test ] [ Edit ] [ Pause ]
Overview Cards
Uptime          Avg Response       Last Check
99.97%          218ms              2 minutes ago
Response Time Chart
Response Time
────────────────────────

        ╭──╮
    ╭───╯  ╰──╮
────╯         ╰────────

────────────────────────
24 hours
Assertions
ASSERTIONS

✓ Status code = 200
✓ Response time < 500ms
✓ $.data.id exists
✓ $.data.email is string
Test History
TEST HISTORY

● 02:30:12    200    184ms
● 02:25:11    200    193ms
● 02:20:10    200    201ms
✕ 02:15:09    500    721ms
● 02:10:08    200    187ms
16. Failed Test View

This is where the product should shine.

API CONTRACT FAILURE

POST /orders

Expected                         Actual

Status: 200                      Status: 200 ✓

$.order.id exists                Missing ✕

$.order.total                   Missing ✕

$.order.amount                  Found ✓

Then:

What changed?

The endpoint returned HTTP 200,
but the response structure changed.

Expected:
order.id
order.total

Received:
order.order_id
order.amount

No AI required for this.

The application itself should provide this explanation deterministically.

17. Incident Page

Header:

🔴 API Incident

POST /payments

Open
Started 14 minutes ago
Timeline
14:02  ✓ Healthy
14:03  ✓ Healthy
14:04  ✕ HTTP 500
14:05  ✕ HTTP 500
14:06  ✕ HTTP 500
14:07  ✕ HTTP 500
Root failure
Expected:
HTTP 200

Received:
HTTP 500

Error:
Internal Server Error
Actions
[ View Test ] [ Acknowledge ] 

For MVP, acknowledgment can be omitted if we want to keep the incident model simple.

18. Incidents List
INCIDENTS

Status    Monitor          Started       Duration

🔴        POST /payments   14m ago       Ongoing
🟢        GET /products    2h ago        8m
🟢        POST /orders     Yesterday     3m

Filters:

All | Open | Resolved
19. Settings

MVP settings:

Account
Name
Email
Password
Notifications
Email
Webhook
Security
Active sessions
Change password

Don't build complicated organization/team settings yet.

20. Important UX States

Every major screen needs:

Loading

Use skeletons rather than blank screens.

Empty

Example:

No monitors yet.

Add your first API endpoint to start monitoring.

[ Add Monitor ]
Error

Example:

We couldn't load this monitor.

[ Try Again ]
Success

Show concise confirmation:

Monitor created successfully.

21. Status System

Use consistent states everywhere.

✓ Healthy
⚠ Degraded
✕ Failing
○ Paused

Don't rely only on colors.

Use:

icon + label + color

for accessibility.

22. Responsive Design
Desktop

Full sidebar + dashboard.

Tablet

Collapsed sidebar.

Mobile

Bottom navigation or compact navigation.

The monitor detail page must remain usable on mobile.

However, this is a developer-focused product, so desktop is the primary experience.

23. Design System

I'd establish these primitives before implementing screens:

Button
Input
Select
Textarea
Badge
StatusIndicator
Card
Table
Modal
Drawer
Tabs
Dropdown
Toast
Tooltip
Skeleton
EmptyState
ErrorState
Chart
24. Component Structure

Potential structure:

components/
├── ui/
│   ├── Button
│   ├── Input
│   ├── Badge
│   ├── Card
│   └── ...
│
├── dashboard/
│   ├── HealthSummary
│   ├── MonitorList
│   ├── IncidentList
│   └── PerformanceChart
│
├── monitors/
│   ├── MonitorForm
│   ├── RequestBuilder
│   ├── AuthBuilder
│   ├── AssertionBuilder
│   ├── MonitorStatus
│   └── TestHistory
│
├── incidents/
│   ├── IncidentList
│   ├── IncidentTimeline
│   └── FailureDetails
│
└── layout/
    ├── Sidebar
    ├── Header
    └── ProjectSwitcher
25. Critical UX Principle

The application should always answer these three questions:

1. Is something broken?
🔴 POST /payments
2. Why is it broken?
Expected 200
Received 500
3. When did it start?
14 minutes ago

Everything else is secondary.

26. Core MVP User Journey

The entire product should feel like this:

Sign Up
   ↓
Create Project
   ↓
Add Monitor
   ↓
Configure Request
   ↓
Define Assertions
   ↓
Run Test
   ↓
✓ Healthy
   ↓
Schedule
   ↓
API Changes
   ↓
✕ Failure
   ↓
Alert
   ↓
Open Incident
   ↓
Understand Exactly What Changed

That is the UX loop I'd design the entire product around.

One design decision I'd challenge

We should not make the dashboard the star of the product.

The monitor detail + failure investigation experience should be the star.

Most monitoring products can make a dashboard with:

98% uptime
12 monitors
3 incidents

That's not difficult.

The impressive part is when a developer clicks a failure and immediately sees:

What was expected → what actually happened → what changed → when it changed.

That's the experience worth obsessing over.