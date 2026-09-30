# Cheesco Equip Hub - Development Guide

## Project Context

This is a **managed heavy-equipment marketplace and rental platform** for Nigeria.

### What This Is NOT
- A simple company website
- A generic construction website
- An instant self-service rental platform
- A Jiji clone

### What This IS
- A production-quality technology platform
- A managed rental orchestration system
- A trusted intermediary for heavy equipment transactions
- A complete lifecycle management system

## Architecture Principles

### 1. Managed Rental Model (CRITICAL)

**DO NOT build instant self-service rentals.**

Every rental MUST follow this workflow:
```
Customer Request → Cheesco Verifies → Quotation → Customer Accepts → 
Agreement → Payment → Logistics → Delivery → Active Rental → 
Return → Inspection → Settlement → Complete
```

The customer CANNOT instantly rent equipment. Cheesco verifies everything.

### 2. State Machine

The rental transaction follows a strict 27-state machine:
- `REQUEST_SUBMITTED`
- `CHEESCO_REVIEWING`
- `EQUIPMENT_VERIFICATION_CHECK`
- `AVAILABILITY_CONFIRMED`
- `QUOTATION_DRAFTED`
- `QUOTATION_SENT`
- `QUOTATION_VIEWED`
- `QUOTATION_ACCEPTED`
- `AGREEMENT_GENERATED`
- `AGREEMENT_SENT`
- `AGREEMENT_SIGNED`
- `PAYMENT_PENDING`
- `PAYMENT_CONFIRMED`
- `DEPOSIT_HELD`
- `LOGISTICS_PENDING`
- `CARRIER_ASSIGNED`
- `IN_TRANSIT`
- `PRE_DELIVERY_INSPECTION`
- `DELIVERED`
- `RENTAL_ACTIVE`
- `RETURN_SCHEDULED`
- `RETURN_IN_PROGRESS`
- `POST_RENTAL_INSPECTION`
- `DEPOSIT_SETTLEMENT`
- `COMPLETED`
- `CANCELLED`
- `DISPUTED`

Only valid transitions are allowed. Backend enforces state transitions.

### 3. Equipment Availability

**CRITICAL**: Prevent double-booking.

- Equipment has an availability calendar
- Dates are blocked when rentals are confirmed
- Backend validates availability on every request
- Overlapping rentals are rejected
- Frontend calendar is for display only - backend is source of truth

### 4. Security

**Never trust the frontend.**

- All authorization happens server-side
- Row-level security (RLS) in database
- Users can only access their own resources
- Admin actions are logged
- Sensitive documents are never public

### 5. Verification Workflows

**Two verification systems:**

1. **Merchant Verification**
   - NOT_STARTED → SUBMITTED → UNDER_REVIEW → VERIFIED
   - Unverified merchants cannot publish equipment
   - Only verification admins can approve

2. **Equipment Verification**
   - DRAFT → SUBMITTED → UNDER_REVIEW → VERIFIED
   - Only verified equipment is publicly listed
   - Verification documents are private

## Service Layer Pattern

All business logic is in service files:

```typescript
lib/services/
  ├── auth.service.ts       # Authentication
  ├── equipment.service.ts  # Equipment CRUD
  ├── rental.service.ts     # Rental requests
  ├── quotation.service.ts  # Quotation management
  ├── payment.service.ts    # Payment processing
  ├── logistics.service.ts  # Delivery tracking
  └── inspection.service.ts # Equipment inspections
```

**DO NOT put business logic in components or pages.**

Components call services. Services handle data and business rules.

## Database Design

### Key Tables

- `users` - All users (extends Supabase auth)
- `merchant_profiles` - Merchant information
- `equipment` - Equipment listings
- `equipment_availability` - Calendar blocking
- `rental_requests` - Rental transactions
- `rental_state_history` - State change audit trail
- `quotations` - Pricing quotes
- `rental_agreements` - Digital agreements
- `payments` - Payment records
- `deposits` - Deposit tracking
- `logistics` - Delivery tracking
- `inspections` - Pre/post rental inspections
- `disputes` - Dispute resolution
- `reviews` - Transaction reviews
- `messages` - Internal messaging
- `notifications` - User notifications
- `audit_logs` - Admin action logging

### Referential Integrity

All foreign keys have ON DELETE CASCADE where appropriate.

State transitions are logged automatically via triggers.

## File Upload Strategy

Equipment images and documents:
- Store in Supabase Storage
- Reference URLs in database
- Apply access policies
- Private documents (ownership, registration) are NOT public
- Public images (equipment photos) are CDN-served

## Payment Flow

1. Customer accepts quotation
2. Backend creates payment record with PENDING status
3. Frontend initiates Paystack payment
4. Customer completes payment on Paystack
5. Paystack webhook hits our API
6. Backend verifies with Paystack API
7. Payment status → CONFIRMED
8. Rental state advances
9. Customer and operations team notified

**Never trust frontend payment status.**

## Notification System

Notifications are triggered by:
- New rental request → Operations team
- Quotation sent → Customer
- Payment confirmed → Operations + Customer
- Delivery scheduled → Customer
- Rental ending soon → Customer + Merchant
- Dispute opened → Support team

Notifications support:
- In-app (database)
- Email (future)
- WhatsApp (future)
- SMS (future)

## Role-Based Access

### Customer
- Browse equipment
- Submit requests
- View own rentals
- Accept quotations
- Make payments
- Review transactions

### Merchant
- Manage own equipment
- View rental requests for own equipment
- See earnings
- Manage ad campaigns
- Cannot approve own equipment

### Operations Admin
- Review all rental requests
- Create quotations
- Assign logistics
- Track deliveries
- Cannot handle payments

### Verification Admin
- Approve/reject merchants
- Approve/reject equipment
- Request more information
- Cannot create quotations

### Finance Admin
- View all payments
- Release deposits
- Process refunds
- Cannot create quotations

### Support Admin
- View disputes
- Communicate with users
- Cannot modify transactions

### Super Admin
- Full access to everything
- Should be limited accounts

## API Route Pattern

```typescript
// app/api/equipment/route.ts
import { NextRequest } from 'next/server';
import { equipmentService } from '@/lib/services/equipment.service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    
    const equipment = await equipmentService.browse({ category });
    
    return Response.json({ data: equipment });
  } catch (error) {
    return Response.json(
      { error: 'Failed to fetch equipment' },
      { status: 500 }
    );
  }
}
```

## Component Pattern

Components should be:
- Small and focused
- Reusable where possible
- Properly typed
- Accessible

Example:
```typescript
// components/equipment-card.tsx
interface EquipmentCardProps {
  equipment: Equipment;
  onSave?: () => void;
}

export function EquipmentCard({ equipment, onSave }: EquipmentCardProps) {
  // Presentation only
  // Business logic in services
}
```

## Animation Guidelines

Use Framer Motion for:
- Page transitions
- Scroll reveals
- Cards hover effects
- Modal entrances
- Success states

**DO NOT over-animate.**
- 300-700ms for UI transitions
- Respect `prefers-reduced-motion`
- Animations should enhance, not distract

## Mobile-First Design

- Bottom navigation for logged-in users
- Responsive tables → cards on mobile
- Touch-friendly tap targets (min 44px)
- Horizontal scroll for wide tables
- Modal sheets instead of dropdowns

## Error Handling

```typescript
try {
  const result = await service.doSomething();
  toast.success('Operation successful');
} catch (error) {
  console.error(error);
  toast.error(error.message || 'Something went wrong');
}
```

Never show raw error messages to users. Log them for debugging.

## Testing Strategy

1. **Unit Tests**: Service functions
2. **Integration Tests**: API routes
3. **E2E Tests**: Critical flows (rental request → payment)
4. **Manual QA**: Full lifecycle testing

## Deployment Checklist

- [ ] All environment variables set
- [ ] Database migrations applied
- [ ] Paystack webhook configured
- [ ] Email service configured
- [ ] Error tracking set up (Sentry)
- [ ] Analytics configured
- [ ] RLS policies tested
- [ ] Admin accounts created
- [ ] Test all user roles
- [ ] Test state machine transitions
- [ ] Test payment flow
- [ ] Test double-booking prevention
- [ ] Load test critical endpoints

## Performance Targets

- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- Largest Contentful Paint: < 2.5s
- Equipment browse page: < 1s load
- Search results: < 500ms

## SEO Requirements

- Semantic HTML
- Proper meta tags
- Open Graph tags
- Structured data for equipment
- Clean URLs (`/equipment/cat-320-excavator-lagos`)
- Image alt text
- Sitemap.xml
- robots.txt

## Coding Standards

- TypeScript strict mode
- ESLint + Prettier
- Conventional commits
- No `any` types
- Proper error handling
- Code comments for business logic
- Descriptive variable names

## Git Workflow

```
main (production)
  ↑
develop (staging)
  ↑
feature/rental-workflow
feature/merchant-dashboard
fix/payment-webhook
```

## DO NOT

- ❌ Build fake features (fake payments, fake verification)
- ❌ Skip authorization checks
- ❌ Trust frontend data
- ❌ Allow instant self-service rentals
- ❌ Make everything yellow (controlled brand usage)
- ❌ Use bulldozer in hero (must be crane)
- ❌ Expose sensitive documents publicly
- ❌ Allow double-booking
- ❌ Skip state validation
- ❌ Hard-code business logic in components

## DO

- ✅ Enforce managed rental workflow
- ✅ Validate server-side
- ✅ Log admin actions
- ✅ Prevent overlapping rentals
- ✅ Use service layer for business logic
- ✅ Create proper error states
- ✅ Build responsive UI
- ✅ Test authorization
- ✅ Handle edge cases
- ✅ Document complex logic

---

**This is a serious technology platform for serious industrial companies.**

Build it like you're presenting to oil & gas companies, major construction firms, and infrastructure contractors. Quality matters.
