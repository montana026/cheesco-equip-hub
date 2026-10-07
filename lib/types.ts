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
  | "PENDING"
  | "VERIFIED"
  | "FLAGGED";

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
  merchantRentalRate: number; // NGN per day — merchant base rate
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

export type AdCampaignStatus = "ACTIVE" | "EXPIRED" | "PENDING_APPROVAL" | "PAUSED";

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
] as const;

export type RentalState = (typeof RENTAL_STATES)[number];

export type QuotationStatus =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "ACCEPTED"
  | "DECLINED"
  | "EXPIRED"
  | "REVISION_REQUESTED";

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

export type DepositStatus = "HELD" | "RELEASED" | "PARTIALLY_DEDUCTED" | "FULLY_DEDUCTED";

export type PaymentType = "RENTAL_FEE" | "DAMAGE_DEPOSIT" | "SALE_ESCROW" | "AD_CAMPAIGN_FEE";

export type PaymentStatus = "PENDING" | "CONFIRMED" | "FAILED" | "REFUNDED";

export interface PaymentRecord {
  id: string;
  rentalRequestId?: string;
  salesTransactionId?: string;
  adCampaignId?: string;
  amount: number;
  currency: "NGN" | "USD";
  type: PaymentType;
  status: "PENDING" | "CONFIRMED" | "FAILED" | "REFUNDED";
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
