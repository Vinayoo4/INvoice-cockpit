 SME Invoice Cockpit

A zero-cost, JSON-backed SaaS invoicing platform purpose-built for Indian Small and Medium Enterprises (SMEs). No external database required — all data is persisted as atomic JSON files on disk.

# Why This Exists

Traditional invoicing software is either expensive SaaS locked behind monthly subscriptions or overwhelming ERP systems designed for large enterprises. SME Invoice Cockpit was created to fill the gap:

- **No DB setup** — zero infrastructure beyond a Node.js server
- **WhatsApp-native** — owners can check overdue invoices by sending "invoices" on WhatsApp
- **GST-ready** — built-in GST line-item computation with Indian tax slabs (0%, 5%, 12%, 18%, 28%)
- **Payment orchestration** — Razorpay webhook integration for auto-reconciliation, UPI/bank transfer/cash support
- **Self-contained** — a single `npm run dev` boots the entire application

# Why Not a Real Database?

This is an **MVP / single-tenant or small-team** tool. JSON files mean:
- Zero ops — no Postgres/MySQL to provision
- Easy backup — just copy the `data/` directory
- Portable — runs on any machine with Node.js

For multi-tenant scale, swap `lib/jsonDb.ts` with SQLite (via `better-sqlite3`) or Postgres (via `prisma`).

---

# Tech Stack

| Layer             | Technology                                                   |
| ----------------- | ------------------------------------------------------------ |
| **Framework**     | Next.js 14 (App Router, React 18)                            |
| **Language**      | TypeScript (strict mode)                                     |
| **Styling**       | Tailwind CSS 3 (dark theme, utility-first)                   |
| **Validation**    | Zod 4 (runtime schema validation)                            |
| **Auth**          | bcryptjs (password hashing) + nanoid (session tokens)        |
| **Server Store**  | JSON files with atomic writes (tmp + rename) + per-file lock |
| **Client Store**  | IndexedDB (primary read layer for UI, instant access)        |
| **State Sync**    | Event-driven refresh bus — mutations trigger cross-page sync |
| **WhatsApp**      | whatsapp-cloud-api SDK                                       |
| **Payments**      | Razorpay webhook integration                                 |
| **PWA**           | Manifest + Service Worker (offline-capable, installable)     |
| **Scheduling**    | Cron-job endpoint for invoice reminders                      |

---

# Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Next.js App Router                     │
│                                                          │
│   ┌───────────┐   ┌──────────────────────────────────┐   │
│   │  Frontend  │   │          API Routes              │   │
│   │  (React)   │   │                                  │   │
│   │            │   │  /api/auth/*      ── Auth         │   │
│   │  pages/    │   │  /api/invoices/*  ── Invoices     │   │
│   │  ───────── │   │  /api/customers/* ── Customers    │   │
│   │  dashboard │   │  /api/payments/*  ── Payments     │   │
│   │  invoices  │   │  /api/items/*     ── Catalog      │   │
│   │  customers │   │  /api/dashboard   ── Stats        │   │
│   │  payments  │   │  /api/reports     ── CSV/Summary  │   │
│   │  reports   │   │  /api/business    ── Settings     │   │
│   │  settings  │   │  /api/webhooks/*  ── Integrations │   │
│   │            │   │  /api/jobs/*      ── Reminders    │   │
│   └─────┬─────┘   └──────────┬───────────────────────┘   │
│         │                    │                            │
│         └────────┬───────────┘                            │
│                  ▼                                        │
│        ┌──────────────────┐                               │
│        │  lib/ & data/    │                               │
│        │  ─────────────── │                               │
│        │  jsonDb.ts  ◀───│── atomic JSON I/O              │
│        │  auth.ts        │   bcrypt + session             │
│        │  invoices.ts    │   business logic               │
│        │  validators.ts  │   Zod schemas                  │
│        │  rateLimit.ts   │   in-memory burst control      │
│        │  whatsappClient │   WA Cloud API wrapper         │
│        │  phone.ts       │   number normalization         │
│        └──────────────────┘                               │
└─────────────────────────────────────────────────────────┘
```

# Data Flow

1. **Browser** → fetches from `/api/*` → `jsonDb.ts` reads/writes `data/*.json`
2. **WhatsApp** → webhook at `/api/webhooks/whatsapp` → looks up user by phone → queries invoices → replies via Cloud API
3. **Razorpay** → webhook at `/api/webhooks/razorpay` → signature verification → auto-records payment → marks invoice paid
4. **Cron job** → hits `/api/jobs/reminders` with secret → iterates users → sends WhatsApp reminders for due-soon/overdue invoices
5. **PWA** → Service Worker caches static assets (cache-first) and API responses (network-first with cache fallback) for offline resilience

---

# Features

# Core
- **Email + password authentication** with session cookies (7-day TTL)
- **Multi-business** support (one business per signup)
- **Role-based** (owner/staff) — extensible for team access
- **Rate limiting** on auth endpoints (IP-based, in-memory)

# Invoicing
- **Invoice CRUD** with auto-numbering (`INV-0001`)
- **Line-item** support with GST computation
- **Status workflow**: Draft → Sent → Paid / Overdue
- **Overdue auto-detection** on read (compares `dueDate` to now)
- **Payment link generation** (shareable URL)

# Customers
- **Customer catalog** with GSTIN, address, phone, email
- **GSTIN format validation** (Indian 15-character format)
- **Live search/filter** on the frontend

# Items / Product Catalog
- **Reusable line items** with HSN code, unit, price, GST rate
- **Quick-select** when building invoices

# Payments
- **Multi-method** support: UPI, Bank Transfer, Cash, Card, Other
- **Auto reconciliation** — invoice status updates to "paid" when fully paid
- **Partial payments** supported — tracks `amountPaid` vs `total`
- **Payment history** on invoice detail page

# Reports & Analytics
- **Dashboard** with revenue, outstanding, overdue stats
- **Monthly summary** — invoice count, value, revenue, avg days to pay
- **Top customers** by revenue and by unpaid amount
- **CSV export** for invoices, payments, and customers

# WhatsApp Integration
- **Webhook verification** (Meta standard)
- **Commands**: `invoices` / `list` / `overdue` → shows overdue list
- **Help** command → shows available options
- **User phone mapping** — link WhatsApp number in Settings
- **Scheduled reminders** — configurable cron endpoint for due-soon (≤3 days) and overdue alerts

# Razorpay Integration
- **Webhook signature verification** (HMAC-SHA256)
- **Auto-payment recording** on `payment.captured` event
- **Link-based payments** — generate shareable invoice payment URLs

# Performance
- **IndexedDB client-side storage** — instant reads, zero network latency for UI rendering
- **Reactive data bus** — mutations trigger cross-page refresh without full navigation
- **Memoized computations** — `useMemo` for filtered/sorted lists, customer lookups
- **Lazy-loaded sidebar** — via Next.js `dynamic()` import, not in initial bundle
- **Local search** — customer list filtering is instant (operates on in-memory data)

# Mobile & PWA
- **Responsive sidebar** — hamburger menu on mobile, fixed sidebar on desktop (CSS `translate-x` toggle)
- **Touch-friendly tables** — `table-responsive` CSS class with `data-label` attributes for mobile card layout
- **PWA Manifest** — installable on home screen with standalone display
- **Service Worker** — cache-first for static assets, network-first for API with offline fallback
- **Viewport meta** — optimized for mobile screens with indigo theme color

# Data Storage Philosophy
- **Client-side primary** — all business data is read from IndexedDB for instant UI rendering
- **Server-side authoritative** — API routes validate and persist to JSON files (required for webhook processing and sync)
- **No-duplicate semantics** — same data lives in two places for different purposes: client for UI speed, server for webhook processing. No third-party replication or analytics storage
- **Auth-only server** — server stores only what's essential: email, password hash, session tokens, business mapping

# Security
- **HTTP-only cookies** for session tokens
- **Content Security Policy** headers (CSP)
- **Rate limiting** on auth endpoints
- **Atomic file writes** (write to `.tmp`, then `rename`)
- **Per-collection file locks** (in-memory mutex)
- **Razorpay HMAC verification** with `timingSafeEqual`

---
# Getting Started

# Prerequisites
- Node.js 18+
- npm

# Installation

```bash
git clone <repo-url>
cd sme-invoice-cockpit
npm install
```

# Configuration

Copy the example env file and fill in your values:

```bash
cp .env.local.example .env.local
```

| Variable                       | Required | Description                               |
| ------------------------------ | -------- | ----------------------------------------- |
| `WA_PHONE_NUMBER_ID`           | No       | WhatsApp Cloud API phone number ID        |
| `WA_ACCESS_TOKEN`              | No       | WhatsApp Cloud API permanent access token |
| `WA_WEBHOOK_VERIFY_TOKEN`      | No       | Custom token for WhatsApp webhook Verify  |
| `WA_BUSINESS_ACCOUNT_ID`       | No       | WhatsApp Business Account ID              |
| `META_WEBHOOK_VERIFY_TOKEN`    | No       | Custom token for Meta webhooks            |
| `CRON_SECRET`                  | No       | Secret for protecting reminder endpoint   |
| `RAZORPAY_WEBHOOK_SECRET`      | No       | Razorpay webhook secret for HMAC verify   |
| `RAZORPAY_PAYMENT_LINK_BASE_URL` | No     | Public base URL for payment links         |

All integrations are optional — the app runs fully without any env vars.

# Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up with your email, business name, and password. Start creating customers and invoices.

# Production Build

```bash
npm run build
npm start
```

# Data Backup

```bash
npm run backup:data
```

Creates a timestamped copy of `/data` in `/backups/`.

---

# Project Structure

```
sme-invoice-cockpit/
├── app/
│   ├── (app)/                    # Authenticated routes (require login)
│   │   ├── dashboard/page.tsx
│   │   ├── invoices/page.tsx
│   │   ├── invoices/new/page.tsx
│   │   ├── invoices/[id]/page.tsx
│   │   ├── customers/page.tsx
│   │   ├── customers/new/page.tsx
│   │   ├── payments/page.tsx
│   │   ├── payments/new/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── settings/page.tsx
│   │   └── layout.tsx            # Sidebar + RequireAuth wrapper
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── page.tsx                  # Root redirect
│   ├── layout.tsx                # Root layout + AuthProvider
│   ├── globals.css               # Tailwind + custom component classes
│   ├── components/
│   │   ├── AuthProvider.tsx       # Auth context (user, business, logout, refresh)
│   │   ├── RequireAuth.tsx        # Route guard
│   │   ├── Sidebar.tsx            # Navigation sidebar
│   │   ├── PageHeader.tsx         # Reusable page title bar
│   │   └── ui.tsx                 # StatusBadge, formatCurrency, formatDate
│   └── api/
│       ├── _auth.ts               # requireUser() helper
│       ├── auth/
│       │   ├── signup/route.ts
│       │   ├── login/route.ts
│       │   ├── logout/route.ts
│       │   └── me/route.ts
│       ├── invoices/
│       │   ├── route.ts
│       │   ├── [id]/route.ts
│       │   └── [id]/payment-link/route.ts
│       ├── customers/route.ts
│       ├── items/route.ts
│       ├── payments/route.ts
│       ├── dashboard/route.ts
│       ├── business/route.ts
│       ├── reports/route.ts
│       ├── webhooks/
│       │   ├── whatsapp/route.ts
│       │   ├── razorpay/route.ts
│       │   └── meta/route.ts
│       └── jobs/
│           └── reminders/route.ts
├── lib/
│   ├── types.ts                  # All TypeScript interfaces
│   ├── jsonDb.ts                 # JSON file persistence layer
│   ├── auth.ts                   # Password hashing & session management
│   ├── invoices.ts               # Invoice CRUD + payment logic + dashboard
│   ├── validators.ts             # Zod schemas for all payloads
│   ├── rateLimit.ts              # In-memory IP-based rate limiting
│   ├── phone.ts                  # Phone number normalization
│   └── whatsappClient.ts         # WhatsApp Cloud API client lazy-loader
├── data/                         # JSON file storage (auto-created)
│   ├── users.json
│   ├── businesses.json
│   ├── customers.json
│   ├── items.json
│   ├── invoices.json
│   ├── payments.json
│   ├── sessions.json
│   └── webhooks.json
├── scripts/
│   └── backupData.mjs
├── .env.local.example
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

# API Reference

# Authentication

| Method | Endpoint            | Description            |
| ------ | ------------------- | ---------------------- |
| POST   | `/api/auth/signup`  | Create account+business|
| POST   | `/api/auth/login`   | Sign in                |
| POST   | `/api/auth/logout`  | Sign out               |
| GET    | `/api/auth/me`      | Get current user+ biz  |
| PATCH  | `/api/auth/me`      | Update WhatsApp number |

# Business

| Method | Endpoint           | Description             |
| ------ | ------------------ | ----------------------- |
| GET    | `/api/business`    | Get business profile    |
| PATCH  | `/api/business`    | Update business details |

# Customers

| Method | Endpoint           | Description          |
| ------ | ------------------ | -------------------- |
| GET    | `/api/customers`   | List customers       |
| POST   | `/api/customers`   | Create customer      |

# Items

| Method | Endpoint     | Description     |
| ------ | ------------ | --------------- |
| GET    | `/api/items` | List items      |
| POST   | `/api/items` | Create item     |
| DELETE | `/api/items?id=` | Delete item |

# Invoices

| Method | Endpoint                     | Description              |
| ------ | ---------------------------- | ------------------------ |
| GET    | `/api/invoices`              | List invoices            |
| POST   | `/api/invoices`              | Create invoice           |
| GET    | `/api/invoices/[id]`         | Get invoice details      |
| PATCH  | `/api/invoices/[id]`         | Update status/notes      |
| DELETE | `/api/invoices/[id]`         | Delete invoice           |
| POST   | `/api/invoices/[id]/payment-link` | Generate payment link |

# Payments

| Method | Endpoint          | Description        |
| ------ | ----------------- | ------------------ |
| GET    | `/api/payments`   | List payments      |
| POST   | `/api/payments`   | Record payment     |

# Dashboard & Reports

| Method | Endpoint                | Description                    |
| ------ | ----------------------- | ------------------------------ |
| GET    | `/api/dashboard`        | Dashboard stats                |
| GET    | `/api/reports?mode=summary&month=YYYY-MM` | Monthly report |
| GET    | `/api/reports?mode=export&type=invoices\|payments\|customers` | CSV download |

# Webhooks

| Method | Endpoint                    | Description              |
| ------ | --------------------------- | ------------------------ |
| GET    | `/api/webhooks/whatsapp`    | WhatsApp webhook verify  |
| POST   | `/api/webhooks/whatsapp`    | Inbound WhatsApp messages|
| GET    | `/api/webhooks/meta`        | Meta webhook verify      |
| POST   | `/api/webhooks/meta`        | Inbound IG/FB messages   |
| POST   | `/api/webhooks/razorpay`    | Razorpay payment events  |

# Scheduled Jobs

| Method | Endpoint              | Description                      |
| ------ | --------------------- | -------------------------------- |
| POST   | `/api/jobs/reminders` | Send WhatsApp payment reminders  |

Protected by `x-cron-secret` header. Set `CRON_SECRET` in `.env.local`.

---

# Code Audit Summary

# Strengths
- **Clean separation** — API routes in `app/api/`, business logic in `lib/`, UI in `app/(app)/`
- **Comprehensive validation** — all inputs validated via Zod schemas before processing
- **Defense in depth** — CSP headers, httpOnly cookies, rate limiting, HMAC webhook verification
- **Atomic writes** — no partial/corrupt JSON files (write to tmp, then rename)
- **TypeScript strict mode** — full type safety across the stack
- **Responsive dark-mode UI** — consistent Tailwind component classes (`.card`, `.input`, `.btn-*`, `.badge-*`)

# Items Noted
- *No invoice editing* — only status/notes/dueDate can be patched (no line-item changes after creation)
- *Rate limiting is in-memory* — resets on server restart (acceptable for single-server)
- *WhatsApp number* must be manually linked in Settings (no self-serve pairing flow yet)
- *Meta webhook* is a placeholder — message handling is not yet implemented

---

# Future Roadmap

1. *Database migration* — swap JSON files for SQLite/Postgres when multi-tenancy is needed
2. *Email delivery* — send invoices via email with PDF attachment
3. *Invoice editing* — allow modifying line items on sent/draft invoices
4. *Staff roles* — invite team members with granular permissions
6. *2FA* — two-factor authentication for account security
7. *GST filing reports* — GSTR-1 / GSTR-3B summary exports
8. *Recurring invoices* — subscription/retainer billing
9. *Public payment page* — hosted checkout for payment links
10. *Multi-language* — English + Hindi + regional language support
