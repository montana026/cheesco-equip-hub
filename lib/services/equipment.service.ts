import { supabaseServer } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api-client';
import { EQUIPMENT } from '@/lib/seed';
import type { Equipment, EquipmentCategory, ListingType } from '@/lib/types';

export interface EquipmentFilters {
  category?: EquipmentCategory;
  listingType?: ListingType;
  state?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  verifiedOnly?: boolean;
  availableOnly?: boolean;
}

/** Fallback image used when no equipment photo is available */
const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=70';

/**
 * Canonical normalizer: converts any raw Supabase equipment row (snake_case) to
 * the typed Equipment interface (camelCase). Single source of truth — used by
 * browse(), getFeatured(), getBySlug() and the page-level helpers in app/page.tsx
 * and app/browse/page.tsx so normalisation logic is never duplicated.
 */
export function normalizeEquipmentRow(raw: Record<string, any>): Equipment {
  const primaryImg =
    raw.images?.find((i: any) => i.is_primary)?.image_url ??
    raw.images?.[0]?.image_url ??
    (typeof raw.images?.[0] === 'string' ? raw.images[0] : null) ??
    FALLBACK_IMG;

  return {
    id: raw.id,
    slug: raw.slug,
    merchantId: raw.merchant_id ?? raw.merchantId ?? '',
    merchantName:
      raw.merchant?.business_name ?? raw.merchant_name ?? raw.merchantName ?? 'Cheesco Verified Merchant',
    name: raw.name,
    category: raw.category,
    brand: raw.brand,
    model: raw.model,
    year: raw.year,
    condition: raw.condition,
    locationState: raw.location_state ?? raw.locationState,
    locationCity: raw.location_city ?? raw.locationCity,
    operatingHours: raw.operating_hours ?? raw.operatingHours ?? 0,
    description: raw.description ?? '',
    specs: raw.specs ?? {},
    listingType: raw.listing_type ?? raw.listingType,
    salePrice: raw.sale_price ?? raw.salePrice ?? undefined,
    // merchantRentalRate is a private cost field — never sent to public/anonymous clients.
    // The type is now optional (see lib/types.ts) so we always omit it from the public normalizer.
    // Merchant-facing APIs that need this field query it separately with server auth.
    merchantRentalRate: undefined,
    cheescoAdjustedRate:
      raw.cheesco_adjusted_rate ??
      raw.cheescoAdjustedRate ??
      undefined,
    isOperatorIncluded: raw.is_operator_included ?? raw.isOperatorIncluded ?? false,
    isDeliveryAvailable: raw.is_delivery_available ?? raw.isDeliveryAvailable ?? true,
    images: [primaryImg],
    privateDocuments: [],
    verificationStatus: raw.verification_status ?? raw.verificationStatus,
    availabilityStatus: raw.availability_status ?? raw.availabilityStatus,
    isFeatured: raw.is_featured ?? raw.isFeatured ?? false,
    promotionTier: raw.promotion_tier ?? raw.promotionTier ?? 'NONE',
    promotionExpiresAt: raw.promotion_expires_at ?? raw.promotionExpiresAt ?? undefined,
    adsMetrics: raw.ads_metrics ?? raw.adsMetrics ?? undefined,
  };
}

/** Active lease states that mark equipment as unavailable */
const ACTIVE_LEASE_STATES = [
  'PAYMENT_CONFIRMED',
  'IN_TRANSIT',
  'DELIVERED',
  'RENTAL_ACTIVE',
  'DEPOSIT_HELD',
  'POST_RENTAL_INSPECTION',
] as const;

/**
 * Fetch all equipment IDs that are currently leased or availability-blocked.
 * Uses Promise.all() so both queries run in parallel — saves one full network
 * round-trip compared to the previous sequential await pattern.
 * Never throws — returns an empty Set on any DB error so callers always get a safe value.
 */
async function fetchLeasedEquipmentIds(): Promise<Set<string>> {
  const todayStr = new Date().toISOString().split('T')[0];
  const ids = new Set<string>();

  try {
    const [leasesRes, blocksRes] = await Promise.all([
      supabaseServer
        .from('rental_requests')
        .select('equipment_id')
        .in('current_state', ACTIVE_LEASE_STATES)
        .gte('end_date', todayStr),
      supabaseServer
        .from('equipment_availability')
        .select('equipment_id')
        .lte('blocked_from', todayStr)
        .gte('blocked_to', todayStr),
    ]);

    (leasesRes.data || []).forEach((r) => { if (r.equipment_id) ids.add(r.equipment_id); });
    (blocksRes.data || []).forEach((b) => { if (b.equipment_id) ids.add(b.equipment_id); });
  } catch (err) {
    // Return empty set — callers treat missing leased IDs as "no active leases"
    // which is safe: it shows more equipment, not less.
    console.warn('fetchLeasedEquipmentIds error (returning empty set):', err);
  }

  return ids;
}

export const equipmentService = {
  /**
   * Browse equipment with filters
   */
  async browse(filters: EquipmentFilters = {}, limit = 50, offset = 0) {
    let dbItems: Equipment[] = [];
    let leasedEquipmentIds = new Set<string>();

    try {
      // Run availability check and equipment query in parallel.
      // Explicit column list — never select merchant_rental_rate, acquisition_cost,
      // contact details, or any internal cost fields that must stay server-private.
      let query = supabaseServer
        .from('equipment')
        .select(`
          id,
          slug,
          merchant_id,
          name,
          category,
          brand,
          model,
          year,
          condition,
          location_state,
          location_city,
          operating_hours,
          description,
          specs,
          listing_type,
          sale_price,
          cheesco_adjusted_rate,
          is_operator_included,
          is_delivery_available,
          verification_status,
          availability_status,
          is_featured,
          promotion_tier,
          promotion_expires_at,
          created_at,
          merchant:merchant_profiles(business_name, verification_status),
          images:equipment_images(image_url, is_primary, display_order)
        `)
        .eq('verification_status', 'VERIFIED')
        .neq('availability_status', 'RENTED')
        .order('created_at', { ascending: false });

      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      if (filters.listingType) {
        query = query.eq('listing_type', filters.listingType);
      }

      if (filters.state) {
        query = query.eq('location_state', filters.state);
      }

      if (filters.availableOnly) {
        query = query.eq('availability_status', 'AVAILABLE');
      }

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,brand.ilike.%${filters.search}%,model.ilike.%${filters.search}%`);
      }

      // ✅ Run availability lookup + equipment fetch in parallel (was sequential)
      const [leasedIds, { data, error }] = await Promise.all([
        fetchLeasedEquipmentIds(),
        query,
      ]);
      leasedEquipmentIds = leasedIds;

      if (!error && data && data.length > 0) {
        dbItems = data
          .filter((raw: any) => {
            // Take leased equipment off the platform till leasing duration is complete
            if (raw.availability_status === 'RENTED' || raw.availability_status === 'MAINTENANCE') return false;
            if (leasedEquipmentIds.has(raw.id) || (raw.slug && leasedEquipmentIds.has(raw.slug))) return false;
            return true;
          })
          .map(normalizeEquipmentRow);
      }
    } catch (err) {
      console.warn('Database equipment browse warning:', err);
    }
    // Filter seed catalog to complement database items
    let seedList = [...EQUIPMENT];

    // Exclude any seed item currently leased or non-available
    seedList = seedList.filter((e) => {
      if (e.availabilityStatus === 'RENTED' || e.availabilityStatus === 'MAINTENANCE') return false;
      if (leasedEquipmentIds.has(e.id) || leasedEquipmentIds.has(e.slug)) return false;
      return true;
    });

    if (filters.category) {
      seedList = seedList.filter((e) => e.category === filters.category);
    }
    if (filters.listingType) {
      seedList = seedList.filter(
        (e) => e.listingType === filters.listingType || e.listingType === 'FOR_SALE_AND_RENT'
      );
    }
    if (filters.state) {
      seedList = seedList.filter((e) => e.locationState.toLowerCase().includes(filters.state!.toLowerCase()));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      seedList = seedList.filter(
        (e) => e.name.toLowerCase().includes(q) || e.brand.toLowerCase().includes(q) || e.model.toLowerCase().includes(q)
      );
    }

    // Merge: database listings first, then seed items (avoiding duplicates by slug)
    const dbSlugs = new Set(dbItems.map((d) => d.slug));
    const combined = [...dbItems, ...seedList.filter((s) => !dbSlugs.has(s.slug))];

    // Priority sorting: active promoted equipment appears at the top
    const now = new Date();
    const getPromotionWeight = (item: Equipment): number => {
      if (!item.promotionTier || item.promotionTier === 'NONE') return 0;
      if (item.promotionExpiresAt && new Date(item.promotionExpiresAt) < now) return 0;
      switch (item.promotionTier) {
        case 'HOMEPAGE_HERO_SPOTLIGHT': return 4;
        case 'HOMEPAGE_FEATURED_GRID': return 3;
        case 'CATEGORY_TOP_BOOST': return 2;
        case 'SEARCH_FIRST_PAGE': return 1;
        default: return 0;
      }
    };

    combined.sort((a, b) => {
      const weightA = getPromotionWeight(a);
      const weightB = getPromotionWeight(b);
      return weightB - weightA;
    });

    return combined.slice(offset, offset + limit);
  },

  /**
   * Get equipment by slug
   */
  async getBySlug(slug: string) {
    try {
      const { data, error } = await supabaseServer
        .from('equipment')
        .select(`
          id,
          slug,
          merchant_id,
          name,
          category,
          brand,
          model,
          year,
          condition,
          location_state,
          location_city,
          operating_hours,
          description,
          specs,
          listing_type,
          sale_price,
          cheesco_adjusted_rate,
          is_operator_included,
          is_delivery_available,
          verification_status,
          availability_status,
          is_featured,
          promotion_tier,
          promotion_expires_at,
          created_at,
          merchant:merchant_profiles(
            id,
            business_name,
            verification_status
          ),
          images:equipment_images(image_url, is_primary, display_order)
        `)
        .eq('slug', slug)
        .eq('verification_status', 'VERIFIED')
        .maybeSingle();

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('Database getBySlug warning:', err);
    }

    const seed = EQUIPMENT.find((e) => e.slug === slug);
    if (!seed) throw new Error('Equipment not found');

    return {
      id: seed.id,
      slug: seed.slug,
      merchant_id: seed.merchantId,
      name: seed.name,
      category: seed.category,
      brand: seed.brand,
      model: seed.model,
      year: seed.year,
      condition: seed.condition,
      location_state: seed.locationState,
      location_city: seed.locationCity,
      operating_hours: seed.operatingHours,
      description: seed.description,
      specs: seed.specs,
      listing_type: seed.listingType,
      sale_price: seed.salePrice,
      merchant_rental_rate: undefined,
      cheesco_adjusted_rate: seed.cheescoAdjustedRate,
      is_operator_included: seed.isOperatorIncluded,
      is_delivery_available: seed.isDeliveryAvailable,
      verification_status: seed.verificationStatus,
      availability_status: seed.availabilityStatus,
      is_featured: seed.isFeatured,
      promotion_tier: seed.promotionTier,
      merchant: { id: 'm-seed', business_name: seed.merchantName, verification_status: 'VERIFIED' },
      images: seed.images.map((img, idx) => ({ image_url: img, is_primary: idx === 0, display_order: idx })),
    };
  },

  /**
   * Fetch equipment by slug (or UUID id) as normalized Equipment domain object
   */
  async getEquipmentBySlug(slug: string): Promise<Equipment | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

    const safeColumns = `
      id,
      slug,
      merchant_id,
      name,
      category,
      brand,
      model,
      year,
      condition,
      location_state,
      location_city,
      operating_hours,
      description,
      specs,
      listing_type,
      sale_price,
      cheesco_adjusted_rate,
      is_operator_included,
      is_delivery_available,
      verification_status,
      availability_status,
      is_featured,
      promotion_tier,
      promotion_expires_at,
      created_at,
      merchant:merchant_profiles(
        id,
        business_name,
        verification_status
      ),
      images:equipment_images(image_url, is_primary, display_order)
    `;

    try {
      let { data, error } = await supabaseServer
        .from('equipment')
        .select(safeColumns)
        .eq('slug', slug)
        .eq('verification_status', 'VERIFIED')
        .maybeSingle();

      if (!data && isUuid) {
        const idRes = await supabaseServer
          .from('equipment')
          .select(safeColumns)
          .eq('id', slug)
          .eq('verification_status', 'VERIFIED')
          .maybeSingle();
        data = idRes.data;
        error = idRes.error;
      }

      if (!error && data) {
        const sortedImages = (data.images || [])
          .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
          .map((img: any) => (typeof img === 'string' ? img : img?.image_url))
          .filter(Boolean);

        const images = sortedImages.length > 0
          ? sortedImages
          : ['https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=70'];

        const merchantObj = Array.isArray(data.merchant) ? data.merchant[0] : data.merchant;

        return {
          id: data.id,
          slug: data.slug || data.id,
          merchantId: data.merchant_id || merchantObj?.id || '',
          merchantName: merchantObj?.business_name || 'Cheesco Verified Merchant',
          name: data.name,
          category: data.category,
          brand: data.brand,
          model: data.model || '',
          year: data.year || new Date().getFullYear(),
          condition: data.condition || 'USED_GOOD',
          locationState: data.location_state || '',
          locationCity: data.location_city || '',
          operatingHours: data.operating_hours ?? 0,
          description: data.description || '',
          specs: data.specs || {},
          listingType: data.listing_type || 'FOR_RENT',
          salePrice: data.sale_price ?? undefined,
          merchantRentalRate: undefined,
          cheescoAdjustedRate: data.cheesco_adjusted_rate ?? undefined,
          isOperatorIncluded: Boolean(data.is_operator_included),
          isDeliveryAvailable: data.is_delivery_available !== false,
          images,
          privateDocuments: [],
          verificationStatus: data.verification_status || 'PENDING',
          availabilityStatus: data.availability_status || 'AVAILABLE',
          isFeatured: Boolean(data.is_featured),
          promotionTier: data.promotion_tier || 'NONE',
          promotionExpiresAt: data.promotion_expires_at || undefined,
        };
      }
    } catch (err) {
      console.warn('Database getEquipmentBySlug warning:', err);
    }

    // Fall back to seed catalog
    const seed = EQUIPMENT.find((e) => e.slug === slug || e.id === slug);
    return seed || null;
  },

  /**
   * Get featured equipment
   */
  async getFeatured(limit = 12) {
    let leasedEquipmentIds = new Set<string>();

    try {
      // Run availability check + featured query in parallel
      const [leasedIds, { data, error }] = await Promise.all([
        fetchLeasedEquipmentIds(),
        supabaseServer
          .from('equipment')
          .select(`
            id,
            slug,
            merchant_id,
            name,
            category,
            brand,
            model,
            year,
            condition,
            location_state,
            location_city,
            operating_hours,
            description,
            specs,
            listing_type,
            sale_price,
            cheesco_adjusted_rate,
            is_operator_included,
            is_delivery_available,
            verification_status,
            availability_status,
            is_featured,
            promotion_tier,
            promotion_expires_at,
            created_at,
            merchant:merchant_profiles(business_name, verification_status),
            images:equipment_images(image_url, is_primary, display_order)
          `)
          .eq('verification_status', 'VERIFIED')
          .eq('is_featured', true)
          .eq('availability_status', 'AVAILABLE')
          .order('created_at', { ascending: false })
          .limit(limit),
      ]);
      leasedEquipmentIds = leasedIds;

      if (!error && data && data.length > 0) {
        return data.filter(
          (eq: any) => !leasedEquipmentIds.has(eq.id) && !leasedEquipmentIds.has(eq.slug)
        );
      }
    } catch (err) {
      console.warn('Database getFeatured warning:', err);
    }

    return EQUIPMENT.filter(
      (e) =>
        e.isFeatured &&
        e.availabilityStatus === 'AVAILABLE' &&
        !leasedEquipmentIds.has(e.id) &&
        !leasedEquipmentIds.has(e.slug)
    )
      .slice(0, limit)
      .map((e) => ({
        id: e.id,
        slug: e.slug,
        merchant_id: e.merchantId,
        name: e.name,
        category: e.category,
        brand: e.brand,
        model: e.model,
        year: e.year,
        condition: e.condition,
        location_state: e.locationState,
        location_city: e.locationCity,
        operating_hours: e.operatingHours,
        description: e.description,
        specs: e.specs,
        listing_type: e.listingType,
        sale_price: e.salePrice,
        merchant_rental_rate: undefined,
        cheesco_adjusted_rate: e.cheescoAdjustedRate,
        is_operator_included: e.isOperatorIncluded,
        is_delivery_available: e.isDeliveryAvailable,
        verification_status: e.verificationStatus,
        availability_status: e.availabilityStatus,
        is_featured: e.isFeatured,
        promotion_tier: e.promotionTier,
        merchant: { business_name: e.merchantName, verification_status: 'VERIFIED' },
        images: e.images.map((img, idx) => ({ image_url: img, is_primary: idx === 0, display_order: idx })),
      }));
  },

  /**
   * Save/unsave equipment (favorites)
   * Uses authenticated /api/saved-equipment endpoint in browser, supabaseServer on server.
   */
  async toggleSaved(equipmentId: string, userId: string) {
    if (typeof window !== 'undefined') {
      const res = await apiFetch('/api/saved-equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipmentId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to toggle saved equipment');
      return { saved: json.saved ?? true };
    }

    // Server-side fallback using supabaseServer
    const { data: existing } = await supabaseServer
      .from('saved_equipment')
      .select('id')
      .eq('user_id', userId)
      .eq('equipment_id', equipmentId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseServer
        .from('saved_equipment')
        .delete()
        .eq('id', existing.id);

      if (error) throw error;
      return { saved: false };
    } else {
      const { error } = await supabaseServer
        .from('saved_equipment')
        .insert({ user_id: userId, equipment_id: equipmentId });

      if (error) throw error;
      return { saved: true };
    }
  },

  /**
   * Get user's saved equipment
   * Explicitly lists only granted safe columns — never selects merchant_rental_rate
   */
  async getSaved(userId: string) {
    if (typeof window !== 'undefined') {
      const res = await apiFetch('/api/saved-equipment');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch saved equipment');
      return json.data || [];
    }

    const { data, error } = await supabaseServer
      .from('saved_equipment')
      .select(`
        id,
        saved_at,
        equipment:equipment!inner(
          id,
          slug,
          merchant_id,
          name,
          category,
          brand,
          model,
          year,
          condition,
          location_state,
          location_city,
          operating_hours,
          description,
          specs,
          listing_type,
          sale_price,
          cheesco_adjusted_rate,
          is_operator_included,
          is_delivery_available,
          verification_status,
          availability_status,
          is_featured,
          promotion_tier,
          promotion_expires_at,
          created_at,
          merchant:merchant_profiles!inner(id, business_name, verification_status),
          images:equipment_images(image_url, is_primary)
        )
      `)
      .eq('user_id', userId)
      .order('saved_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Check equipment availability for date range
   */
  async checkAvailability(equipmentId: string, startDate: Date, endDate: Date) {
    const start = startDate.toISOString();
    const end = endDate.toISOString();

    // Overlap: existing block starts before our end AND ends after our start
    const { data, error } = await supabaseServer
      .from('equipment_availability')
      .select('*')
      .eq('equipment_id', equipmentId)
      .lt('blocked_from', end)
      .gt('blocked_to', start);

    if (error) throw error;

    return {
      isAvailable: (data?.length ?? 0) === 0,
      conflicts: data || [],
    };
  },
};
