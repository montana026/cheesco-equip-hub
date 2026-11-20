/* ── Cheesco Equip Hub — Core Domain Types ─────────────────────────── */

export type UserRole =
  | "CUSTOMER"
  | "MERCHANT"
  | "OPERATIONS_ADMIN"
  | "VERIFICATION_ADMIN"
  | "FINANCE_ADMIN"
  | "SUPPORT_ADMIN"
  | "SUPER_ADMIN";

export type MerchantVerificationStatus =
  | "NOT_STARTED"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "MORE_INFORMATION_REQUIRED"
  | "VERIFIED"
  | "REJECTED"
  | "SUSPENDED";

export type EquipmentCategory =
  | "Excavators"
  | "Cranes"
  | "Trucks"
  | "Bulldozers"
  | "Loaders"
  | "Generators"
  | "Lowbeds"
  | "Forklifts"
  | "Compactors"
  | "Other";

export type ListingType = "FOR_SALE" | "FOR_RENT" | "FOR_SALE_AND_RENT";

export type EquipmentCondition = "NEW" | "USED_EXCELLENT" | "USED_GOOD" | "USED_FAIR";

export type EquipmentVerificationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "MORE_INFORMATION_REQUIRED"
  | "VERIFIED"
  | "REJECTED"
  | "SUSPENDED";

export type AvailabilityStatus = "AVAILABLE" | "RENTED" | "RESERVED" | "MAINTENANCE";

export type PromotionTier =
  | "NONE"
  | "HOMEPAGE_HERO_SPOTLIGHT"
  | "HOMEPAGE_FEATURED_GRID"
  | "CATEGORY_TOP_BOOST"
  | "SEARCH_FIRST_PAGE";

export interface EquipmentSpecs {
  operatingWeight?: string;
  maxLiftCapacity?: string;
  boomReach?: string;
  enginePower?: string;
  fuelType?: string;
  [key: string]: string | undefined;
}

export interface Equipment {
  id: string;
  slug: string;
  merchantId: string;
  merchantName: string;
  name: string;
  category: EquipmentCategory;
  brand: string;
  model: string;
  year: number;
  condition: EquipmentCondition;
  locationState: string;
  locationCity: string;
  operatingHours: number;
  description: string;
  specs: EquipmentSpecs;
  listingType: ListingType;
  salePrice?: number; // NGN
  merchantRentalRate?: number; // NGN per day — merchant base rate (server-private; not sent to public clients)
  cheescoAdjustedRate?: number; // NGN per day — after Cheesco price influence
  isOperatorIncluded: boolean;
  isDeliveryAvailable: boolean;
  images: string[];
  privateDocuments: string[]; // ownership docs visible to Cheesco ops only
  verificationStatus: EquipmentVerificationStatus;
  availabilityStatus: AvailabilityStatus;
  isFeatured: boolean;
  promotionTier: PromotionTier;
  promotionExpiresAt?: string;
  adsMetrics?: { impressions: number; clicks: number; enquiries: number };
}

export type AdPackageType =
  | "HOMEPAGE_HERO_SPOTLIGHT"
  | "HOMEPAGE_FEATURED_GRID"
  | "CATEGORY_TOP_BOOST"
  | "SEARCH_FIRST_PAGE";

export interface AdPackage {
  type: AdPackageType;
  label: string;
  description: string;
  durationDays: number;
  priceNgn: number;
}

export type AdCampaignStatus = "PENDING_APPROVAL" | "ACTIVE" | "PAUSED" | "EXPIRED" | "CANCELLED";

export interface AdCampaign {
  id: string;
  merchantId: string;
  equipmentId: string;
  packageType: AdPackageType;
  amountPaid: number;
  durationDays: number;
  startDate: string;
  endDate: string;
  status: AdCampaignStatus;
  impressionsCount: number;
  clicksCount: number;
  enquiriesCount: number;
  paymentRef: string;
  createdAt: string;
}

/* ── Rental lifecycle: 27-state managed machine ─────────────────────── */

export const RENTAL_STATES = [
  "REQUEST_SUBMITTED",
  "CHEESCO_REVIEWING",
  "EQUIPMENT_VERIFICATION_CHECK",
  "AVAILABILITY_CONFIRMED",
  "QUOTATION_DRAFTED",
  "QUOTATION_SENT",
  "QUOTATION_VIEWED",
  "QUOTATION_ACCEPTED",
  "QUOTATION_REVISION_REQUESTED",
  "AGREEMENT_GENERATED",
  "AGREEMENT_SENT",
  "AGREEMENT_SIGNED",
  "PAYMENT_PENDING",
  "PAYMENT_PARTIALLY_RECEIVED",
  "PAYMENT_CONFIRMED",
  "DEPOSIT_HELD",
  "LOGISTICS_PENDING",
  "CARRIER_ASSIGNED",
  "IN_TRANSIT",
  "PRE_DELIVERY_INSPECTION",
  "DELIVERED",
  "RENTAL_ACTIVE",
  "RETURN_SCHEDULED",
  "RETURN_IN_PROGRESS",
  "POST_RENTAL_INSPECTION",
  "DEPOSIT_SETTLEMENT",
  "COMPLETED",
  "CANCELLED",
  "DISPUTED",
] as const;

export type RentalState = (typeof RENTAL_STATES)[number];

export type QuotationStatus =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "ACCEPTED"
  | "DECLINED"
  | "EXPIRED"
  | "REVISION_REQUESTED"
  | "CANCELLED";

export interface QuotationLineItem {
  label: string;
  amount: number;
  note?: string;
}

export interface Quotation {
  id: string;
  rentalRequestId: string;
  referenceNo: string;
  merchantBaseRate: number;
  cheescoMarginRate: number; // % markup applied by Cheesco operations
  cheescoManagedRate: number; // per-day customer rate after margin
  lineItems: QuotationLineItem[];
  merchantPayoutTotal: number;
  cheescoGrossMargin: number;
  customerTotalAmount: number;
  status: QuotationStatus;
  validUntil: string;
  terms: string;
}

export type SalesEscrowStatus =
  | "AWAITING_PAYMENT"
  | "PAYMENT_HELD_IN_ESCROW"
  | "RELEASED_TO_MERCHANT"
  | "REFUNDED";

export type TitleTransferStatus =
  | "PENDING"
  | "INSPECTION_PASSED"
  | "DOCS_TRANSFERRED"
  | "DELIVERED"
  | "COMPLETED";

export interface SalesTransaction {
  id: string;
  enquiryId: string;
  equipmentId: string;
  customerId: string;
  merchantId: string;
  agreedSalePrice: number;
  cheescoCommissionPct: number; // default 5.0
  cheescoCommissionAmount: number;
  merchantPayoutAmount: number;
  escrowStatus: SalesEscrowStatus;
  titleTransferStatus: TitleTransferStatus;
  createdAt: string;
  completedAt?: string;
}

export const DEPOSIT_STATUS = {
  HELD: "HELD",
  RELEASED: "RELEASED",
  PARTIALLY_DEDUCTED: "PARTIALLY_DEDUCTED",
  FULLY_DEDUCTED: "FULLY_DEDUCTED",
} as const;
export type DepositStatus = (typeof DEPOSIT_STATUS)[keyof typeof DEPOSIT_STATUS];

export const PAYMENT_TYPE = {
  RENTAL_FEE: "RENTAL_FEE",
  DAMAGE_DEPOSIT: "DAMAGE_DEPOSIT",
  SALE_PAYMENT: "SALE_PAYMENT",
  AD_CAMPAIGN_FEE: "AD_CAMPAIGN_FEE",
} as const;
export type PaymentType = (typeof PAYMENT_TYPE)[keyof typeof PAYMENT_TYPE];

export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  CONFIRMED: "CONFIRMED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
} as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export interface PaymentRecord {
  id: string;
  rentalRequestId?: string;
  salesTransactionId?: string;
  adCampaignId?: string;
  amount: number;
  currency: "NGN" | "USD";
  type: PaymentType;
  status: PaymentStatus;
  depositStatus?: DepositStatus;
  depositDeductionAmount?: number;
  createdAt: string;
}

export type InspectionKind = "PRE_DELIVERY" | "POST_RENTAL";

export interface InspectionRecord {
  id: string;
  rentalRequestId: string;
  kind: InspectionKind;
  inspectorName: string;
  hourMeterReading: number;
  checklist: { item: string; passed: boolean; note?: string }[];
  conditionPhotos: string[];
  depositDeductionRecommendation?: number;
  createdAt: string;
}

export interface DisputeRecord {
  id: string;
  rentalRequestId: string;
  raisedBy: "CUSTOMER" | "MERCHANT";
  reason: string;
  evidence: string[];
  cheescoRuling?: string;
  depositDeduction?: number;
  status: "OPEN" | "UNDER_REVIEW" | "RESOLVED";
  createdAt: string;
}

/* ── Canonical DB enum constants ──────────────────────────────────────────── */
/* Use these instead of raw string literals for all DB column comparisons.     */

export const AD_CAMPAIGN_STATUS = {
  PENDING_APPROVAL: "PENDING_APPROVAL",
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
} as const;

export const EQUIPMENT_VERIFICATION_STATUS = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  MORE_INFORMATION_REQUIRED: "MORE_INFORMATION_REQUIRED",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
  SUSPENDED: "SUSPENDED",
} as const;
export type EquipmentVerificationStatusEnum = (typeof EQUIPMENT_VERIFICATION_STATUS)[keyof typeof EQUIPMENT_VERIFICATION_STATUS];

export const LOGISTICS_STATUS = {
  PENDING: "PENDING",
  ASSIGNED: "ASSIGNED",
  PREPARING: "PREPARING",
  DISPATCHED: "DISPATCHED",
  IN_TRANSIT: "IN_TRANSIT",
  ARRIVED: "ARRIVED",
  DELIVERED: "DELIVERED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;
export type LogisticsStatus = (typeof LOGISTICS_STATUS)[keyof typeof LOGISTICS_STATUS];

export const MERCHANT_VERIFICATION_STATUS = {
  NOT_STARTED: "NOT_STARTED",
  SUBMITTED: "SUBMITTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  MORE_INFORMATION_REQUIRED: "MORE_INFORMATION_REQUIRED",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
  SUSPENDED: "SUSPENDED",
} as const;
export type MerchantVerificationStatusEnum = (typeof MERCHANT_VERIFICATION_STATUS)[keyof typeof MERCHANT_VERIFICATION_STATUS];

export const NOTIFICATION_TYPE = {
  RENTAL_REQUEST: "RENTAL_REQUEST",
  QUOTATION: "QUOTATION",
  PAYMENT: "PAYMENT",
  LOGISTICS: "LOGISTICS",
  DELIVERY: "DELIVERY",
  INSPECTION: "INSPECTION",
  DISPUTE: "DISPUTE",
  MESSAGE: "MESSAGE",
  SYSTEM: "SYSTEM",
} as const;
export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

export const QUOTATION_STATUS = {
  DRAFT: "DRAFT",
  SENT: "SENT",
  VIEWED: "VIEWED",
  ACCEPTED: "ACCEPTED",
  DECLINED: "DECLINED",
  EXPIRED: "EXPIRED",
  REVISION_REQUESTED: "REVISION_REQUESTED",
  CANCELLED: "CANCELLED",
} as const;
export type QuotationStatusEnum = (typeof QUOTATION_STATUS)[keyof typeof QUOTATION_STATUS];

export const RENTAL_STATE = {
  REQUEST_SUBMITTED: "REQUEST_SUBMITTED",
  CHEESCO_REVIEWING: "CHEESCO_REVIEWING",
  EQUIPMENT_VERIFICATION_CHECK: "EQUIPMENT_VERIFICATION_CHECK",
  AVAILABILITY_CONFIRMED: "AVAILABILITY_CONFIRMED",
  QUOTATION_DRAFTED: "QUOTATION_DRAFTED",
  QUOTATION_SENT: "QUOTATION_SENT",
  QUOTATION_VIEWED: "QUOTATION_VIEWED",
  QUOTATION_ACCEPTED: "QUOTATION_ACCEPTED",
  QUOTATION_REVISION_REQUESTED: "QUOTATION_REVISION_REQUESTED",
  AGREEMENT_GENERATED: "AGREEMENT_GENERATED",
  AGREEMENT_SENT: "AGREEMENT_SENT",
  AGREEMENT_SIGNED: "AGREEMENT_SIGNED",
  PAYMENT_PENDING: "PAYMENT_PENDING",
  PAYMENT_PARTIALLY_RECEIVED: "PAYMENT_PARTIALLY_RECEIVED",
  PAYMENT_CONFIRMED: "PAYMENT_CONFIRMED",
  DEPOSIT_HELD: "DEPOSIT_HELD",
  LOGISTICS_PENDING: "LOGISTICS_PENDING",
  CARRIER_ASSIGNED: "CARRIER_ASSIGNED",
  IN_TRANSIT: "IN_TRANSIT",
  PRE_DELIVERY_INSPECTION: "PRE_DELIVERY_INSPECTION",
  DELIVERED: "DELIVERED",
  RENTAL_ACTIVE: "RENTAL_ACTIVE",
  RETURN_SCHEDULED: "RETURN_SCHEDULED",
  RETURN_IN_PROGRESS: "RETURN_IN_PROGRESS",
  POST_RENTAL_INSPECTION: "POST_RENTAL_INSPECTION",
  DEPOSIT_SETTLEMENT: "DEPOSIT_SETTLEMENT",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  DISPUTED: "DISPUTED",
} as const;

export const TICKET_PRIORITY = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const;
export type TicketPriority = (typeof TICKET_PRIORITY)[keyof typeof TICKET_PRIORITY];

export const TICKET_CATEGORY = {
  RENTAL: "RENTAL",
  PAYMENT: "PAYMENT",
  EQUIPMENT: "EQUIPMENT",
  DELIVERY: "DELIVERY",
  MERCHANT: "MERCHANT",
  DISPUTE: "DISPUTE",
  ACCOUNT: "ACCOUNT",
  OTHER: "OTHER",
} as const;
export type TicketCategory = (typeof TICKET_CATEGORY)[keyof typeof TICKET_CATEGORY];

export const TICKET_STATUS = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  AWAITING_CUSTOMER: "AWAITING_CUSTOMER",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
} as const;
export type TicketStatusEnum = (typeof TICKET_STATUS)[keyof typeof TICKET_STATUS];

export const USER_ROLE = {
  CUSTOMER: "CUSTOMER",
  MERCHANT: "MERCHANT",
  OPERATIONS_ADMIN: "OPERATIONS_ADMIN",
  VERIFICATION_ADMIN: "VERIFICATION_ADMIN",
  FINANCE_ADMIN: "FINANCE_ADMIN",
  SUPPORT_ADMIN: "SUPPORT_ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;

/**
 * Rental states allowed as a previous state before PAYMENT_CONFIRMED.
 * Any state outside this list in a live webhook means the rental was
 * already past payment — do not send duplicate notifications.
 */
export const RENTAL_PAYMENT_ALLOWED_STATES = [
  "QUOTATION_ACCEPTED",
  "AGREEMENT_GENERATED",
  "AGREEMENT_SENT",
  "AGREEMENT_SIGNED",
  "PAYMENT_PENDING",
  "PAYMENT_PARTIALLY_RECEIVED",
] as const;

/** States that are already past payment — no notification needed if 0 rows updated. */
export const RENTAL_POST_PAYMENT_STATES = [
  "PAYMENT_CONFIRMED",
  "DEPOSIT_HELD",
  "LOGISTICS_PENDING",
  "CARRIER_ASSIGNED",
  "IN_TRANSIT",
  "PRE_DELIVERY_INSPECTION",
  "DELIVERED",
  "RENTAL_ACTIVE",
  "RETURN_SCHEDULED",
  "RETURN_IN_PROGRESS",
  "POST_RENTAL_INSPECTION",
  "DEPOSIT_SETTLEMENT",
  "COMPLETED",
] as const;

/** Quotation statuses that allow ACCEPTED transition. */
export const QUOTATION_PAYMENT_ALLOWED_STATUSES = ["SENT", "VIEWED"] as const;
