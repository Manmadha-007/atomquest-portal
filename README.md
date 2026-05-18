# AtomQuest Portal

<p align="center">
  <img
    src="docs/architecture/atomquest-high-level-architecture.png"
    alt="AtomQuest High-Level Architecture"
    width="100%"
  />
</p>

<p align="center">

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?style=for-the-badge&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?style=for-the-badge&logo=postgresql)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)
![Auth.js](https://img.shields.io/badge/Auth.js-v5-black?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-purple?style=for-the-badge)

</p>

---

# Overview

AtomQuest Portal is a role-based enterprise goal operations and governance platform designed for quarterly planning, execution tracking, accountability workflows, escalation lifecycle management, and operational visibility.

The platform enables:

- employees to create and track goals,
- managers to review execution and approvals,
- administrators to oversee governance workflows, escalations, analytics, and operational health.

AtomQuest combines deterministic governance workflows, audit visibility, notification orchestration, review-cycle management, and escalation lifecycle tracking into a single operational platform.

Built with:

- Next.js App Router
- Auth.js
- Prisma ORM
- PostgreSQL
- TypeScript
- Tailwind CSS
- Feature-scoped governance modules

---

# Feature Highlights

## Core Platform Features

- Role-based enterprise dashboards
- Goal lifecycle management
- Quarterly review cycles
- Manager approval workflows
- Governance escalation engine
- Deterministic rule evaluation
- Notification orchestration
- Governance analytics dashboards
- Operational execution tracking
- Lifecycle auditability
- Microsoft Teams integration
- Email reminder infrastructure
- Execution duplicate suppression
- Governance operations console

---

# Why AtomQuest Exists

Traditional performance management platforms often struggle with:

- weak operational accountability,
- delayed approvals,
- missing quarterly check-ins,
- fragmented reporting,
- poor governance visibility,
- shallow auditability.

AtomQuest was built to solve those operational gaps through:

- structured goal lifecycle workflows,
- deterministic escalation evaluation,
- governance execution tracking,
- lifecycle auditability,
- analytics-driven visibility,
- operationally realistic accountability systems.

The platform is intentionally designed to behave like enterprise governance middleware rather than a simple dashboard application.

---

# Governance Design Principles

AtomQuest follows several core architectural principles.

---

## Deterministic Governance

Governance behavior should remain predictable and explainable.

Escalation evaluation uses:

- strongly typed rules,
- deterministic evaluators,
- explicit lifecycle transitions,
- idempotent execution behavior.

---

## Auditability

Operationally important actions should remain traceable.

The platform preserves:

- escalation execution history,
- lifecycle ownership,
- notification delivery tracking,
- governance analytics,
- workflow audit visibility.

---

## Operational Realism

The platform models how enterprise organizations actually manage:

- quarterly planning,
- approvals,
- accountability,
- escalations,
- governance reporting.

---

## Separation of Concerns

Evaluation, orchestration, delivery, lifecycle management, and analytics remain isolated layers.

This avoids:

- workflow-engine complexity,
- tightly coupled automation,
- governance instability.

---

## Duplicate Suppression

Repeated governance execution must not generate:

- duplicate escalations,
- duplicate notifications,
- duplicate lifecycle artifacts.

AtomQuest includes deterministic duplicate suppression throughout governance execution.

---

# Governance Escalation Lifecycle

AtomQuest includes a complete escalation governance lifecycle:

```text
Violation
→ Rule Evaluation
→ Escalation Creation
→ Notification Delivery
→ Execution Tracking
→ Resolution Workflow
→ Analytics Visibility
```

The governance flow is intentionally:

- deterministic,
- auditable,
- operationally realistic,
- role-aware.

---

# Governance Execution Flow

## 1. Rule Evaluation

Governance evaluators inspect operational workflow state.

Examples include:

- goals not submitted,
- approvals pending too long,
- missed quarterly check-ins.

---

## 2. Escalation Creation

Detected governance violations generate:

- escalation logs,
- lifecycle metadata,
- escalation ownership,
- audit-ready governance records.

---

## 3. Notification Orchestration

Escalation notifications are delivered through:

- email,
- Microsoft Teams.

Delivery tracking and duplicate suppression remain preserved.

---

## 4. Execution Tracking

Governance runs generate execution history including:

- trigger source,
- execution status,
- notification metrics,
- duplicate metrics,
- lifecycle statistics.

---

## 5. Lifecycle Resolution

Escalations can be:

- resolved,
- dismissed,
- reviewed operationally.

Lifecycle ownership and timestamps remain auditable.

---

## 6. Governance Analytics

Governance analytics provide visibility into:

- open escalations,
- lifecycle health,
- execution reliability,
- accountability metrics,
- governance workload trends.

---

# Quick Start

## Install Dependencies

```bash
npm install
```

---

## Apply Prisma Migrations

```bash
npx prisma migrate dev
```

---

## Seed Demo Data

```bash
npx prisma db seed
```

---

## Start Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# Demo Credentials

After seeding:

```bash
npx prisma db seed
```

Use the following demo accounts:

| Role     | Email                              |
|----------|------------------------------------|
| Admin    | `atomquest.admin.demo@gmail.com` |
| Manager  | `atomquest.manager.demo@gmail.com` |
| Employee | `atomquest.employee.demo@gmail.com` |

Password:

```text
Password@123
```

---

# Key Features

# Authentication & RBAC

- Auth.js / NextAuth v5 authentication
- Microsoft Entra ID integration
- Credentials authentication
- Role-aware routing
- Session-based access control
- Protected dashboard isolation

Supported roles:

- ADMIN
- MANAGER
- EMPLOYEE

---

# Goal Lifecycle Workflows

Employees can:

- create draft goals,
- edit goals,
- submit goals,
- track progress,
- submit quarterly updates,
- monitor approval state.

Managers can:

- review direct-report goals,
- approve or reject submissions,
- monitor operational execution,
- track overdue goals,
- manage shared goals.

Administrators can:

- manage review cycles,
- oversee governance visibility,
- review operational analytics,
- export governance data,
- manage platform operations.

---

# Review Cycle Management

The platform supports:

- active review cycles,
- quarterly governance windows,
- operational planning periods,
- approval enforcement,
- review-cycle analytics.

---

# Notifications & Reminder Orchestration

Notification infrastructure supports:

- email delivery,
- Microsoft Teams delivery,
- deep-link navigation,
- governance escalation notifications,
- quarterly reminder workflows.

Supported notification events:

- goal submitted,
- goal approved,
- goal rejected,
- check-in reminder,
- escalation opened.

---

# Escalation Governance Engine

AtomQuest includes a feature-scoped governance escalation platform.

Capabilities include:

- rule-based evaluation,
- deterministic escalation generation,
- duplicate suppression,
- lifecycle tracking,
- execution orchestration,
- delivery tracking,
- scheduler execution,
- governance analytics,
- role-aware governance operations.

---

# Governance Operations Console

The governance console provides:

- escalation visibility,
- execution history,
- lifecycle management,
- scheduler controls,
- analytics dashboards,
- governance metrics,
- operational monitoring.

Role-aware governance routes:

- `/dashboard/admin/governance`
- `/dashboard/manager/governance`

---

# Tech Stack

## Frontend

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui
- Radix UI
- Recharts
- React Hook Form
- Zod

---

## Backend

- Next.js Route Handlers
- Server Actions
- Auth.js / NextAuth v5
- JWT Sessions

---

## Database

- PostgreSQL
- Prisma ORM
- Prisma Adapter PG

---

## Integrations

- Microsoft Entra ID
- Resend Email
- Microsoft Teams Webhooks

---

## Tooling

- ESLint
- Prisma CLI
- tsx
- npm

---

# Architecture

<p align="center">
  <img
    src="docs/architecture/atomquest-high-level-architecture.png"
    alt="AtomQuest High-Level Architecture"
    width="100%"
  />
</p>

---

# System Overview

## Presentation Layer

- Next.js App Router dashboards
- Governance console
- Analytics visualizations
- Role-aware operational UI

---

## Authentication Layer

- Auth.js session management
- RBAC enforcement
- Dashboard route isolation
- Microsoft Entra integration

---

## Workflow Layer

- goal lifecycle workflows,
- approvals,
- quarterly updates,
- review cycles,
- shared goals,
- audit logging.

---

## Governance Layer

- escalation evaluators,
- orchestration services,
- execution tracking,
- lifecycle resolution,
- duplicate suppression,
- scheduler execution.

---

## Notification Layer

- email delivery,
- Teams delivery,
- delivery tracking,
- deep-link routing.

---

## Analytics Layer

- governance metrics,
- escalation visibility,
- execution health,
- accountability reporting.

---

## Persistence Layer

- PostgreSQL database,
- Prisma ORM,
- governance audit storage,
- execution persistence.

---

# Repository Structure

```text
.
|-- docs/
|   `-- architecture/
|
|-- prisma/
|   |-- migrations/
|   |-- seed-data/
|   |-- schema.prisma
|   `-- seed.ts
|
|-- public/
|
|-- src/
|   |-- actions/
|   |-- app/
|   |-- components/
|   |-- features/
|   |-- hooks/
|   |-- lib/
|   |-- auth.ts
|   `-- proxy.ts
|
|-- AGENTS.md
|-- components.json
|-- next.config.ts
|-- package.json
|-- prisma.config.ts
`-- tsconfig.json
```

---

# Prerequisites

- Node.js 20+
- npm
- PostgreSQL database

Optional:

- Microsoft Entra credentials
- Resend API key
- Microsoft Teams webhook URL

---

# Local Development Setup

## Install Dependencies

```bash
npm install
```

---

## Configure Environment Variables

Create:

```text
.env
```

---

## Run Migrations

```bash
npx prisma migrate dev
```

---

## Seed Demo Data

```bash
npx prisma db seed
```

---

## Start Application

```bash
npm run dev
```

---

# Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL runtime connection |
| `DIRECT_URL` | Prisma direct database connection |
| `AUTH_URL` | Auth.js application URL |
| `AUTH_SECRET` | Auth.js secret |
| `AUTH_TRUST_HOST` | Host trust configuration |
| `AUTH_MICROSOFT_ENTRA_ID_ID` | Entra client ID |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET` | Entra client secret |
| `AUTH_MICROSOFT_ENTRA_ID_ISSUER` | Entra issuer |
| `APP_BASE_URL` | Deep-link base URL |
| `RESEND_API_KEY` | Email provider |
| `EMAIL_FROM` | Sender email |
| `TEAMS_WEBHOOK_URL` | Teams webhook |
| `CRON_SECRET` | Cron route security |

---

# Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx prisma validate` | Validate Prisma schema |
| `npx prisma migrate dev` | Run migrations |
| `npx prisma db seed` | Seed demo data |

---

# Validation Status

The platform currently validates successfully with:

```bash
npm run build
npm run lint
npx prisma validate
```

Governance execution, lifecycle workflows, orchestration, analytics, and dashboard operations are operationally stable.

---

# Governance APIs

Governance APIs support:

- escalation retrieval,
- execution triggering,
- lifecycle actions,
- analytics access,
- scheduler controls.

Examples:

- `/api/governance/escalations`
- `/api/governance/executions/run`
- `/api/governance/analytics/overview`
- `/api/governance/scheduler/start`

---

# Usage Overview

## Typical Operational Flow

1. Administrator activates a review cycle.
2. Employees create and submit goals.
3. Managers approve or reject goals.
4. Employees submit quarterly updates.
5. Governance evaluators inspect workflow state.
6. Escalations are generated for operational violations.
7. Notifications are delivered.
8. Governance analytics update.
9. Managers and administrators resolve escalations.

---

# Recommended Production Hardening

Recommended production practices:

- secure cron routes,
- HTTPS-only deployment,
- managed PostgreSQL backups,
- provider secret rotation,
- controlled governance execution,
- operational monitoring.

---

# Contribution Notes

- Preserve RBAC consistency.
- Preserve governance auditability.
- Preserve deterministic escalation behavior.
- Keep orchestration layers separated.
- Update migrations and seed data together.

---

# License

MIT License

---

# Final Notes

AtomQuest is intentionally designed as:

- a deterministic governance platform,
- an operational accountability system,
- an enterprise workflow orchestration layer.

The platform prioritizes:

- auditability,
- operational realism,
- lifecycle traceability,
- governance visibility,
- execution reliability,

over unnecessary infrastructure complexity.