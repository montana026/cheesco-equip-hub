@AGENTS.md

# Cheesco Equip Hub - AI Assistant Guide

## Project Overview

This is a **managed heavy-equipment marketplace and rental platform** for Nigeria. NOT a simple website.

### Core Business Model

Cheesco acts as a trusted intermediary for heavy equipment transactions. Every rental follows a managed workflow:

Customer Request → Cheesco Verifies → Quotation → Agreement → Payment → Logistics → Delivery → Rental → Return → Inspection → Settlement

**CRITICAL**: This is NOT a self-service platform. Customers cannot instantly rent equipment. Cheesco operations team verifies and manages every transaction.

### Tech Stack

- Next.js 16.3.6 (App Router) + TypeScript
- Tailwind CSS 4 + Framer Motion
- PostgreSQL via Supabase
- Paystack for payments

### Key Rules

1. **Managed Rental Model**: No instant self-service. Every rental is verified by Cheesco operations.
2. **27-State Machine**: Rental transactions follow strict state transitions. See `lib/types.ts` for `RentalState`.
3. **Double-Booking Prevention**: Equipment availability is enforced server-side via `equipment_availability` table.
4. **Verification Required**: Unverified merchants cannot publish equipment. Unverified equipment is not public.
5. **Authorization**: All business logic is server-side. Never trust frontend. Use RLS policies.
6. **Service Layer**: Business logic goes in `lib/services/`. Components call services.

### When Making Changes

- **Database changes**: Update `supabase/schema.sql` and apply via Supabase SQL Editor
- **New features**: Follow service layer pattern. Keep business logic out of components.
- **State changes**: Ensure valid state transitions in rental state machine
- **Security**: Add RLS policies for new tables. Test authorization.

### Before Implementing

Read:
- `DEVELOPMENT.md` - Architecture and patterns
- `lib/types.ts` - Type definitions and state machine
- `supabase/schema.sql` - Database schema

### Hero Section

MUST feature a **CRANE** (not bulldozer). This is non-negotiable per brand guidelines.
