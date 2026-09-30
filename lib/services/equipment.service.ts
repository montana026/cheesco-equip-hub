import { supabase } from '@/lib/supabase/client';
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

export const equipmentService = {
  /**
   * Browse equipment with filters
   */
  async browse(filters: EquipmentFilters = {}, limit = 50, offset = 0) {
    let query = supabase
      .from('equipment')
      .select(`
        *,
        merchant:merchant_profiles!inner(business_name, verification_status),
        images:equipment_images(image_url, is_primary, display_order)
      `)
      .eq('verification_status', 'VERIFIED')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

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

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  /**
   * Get equipment by slug
   */
  async getBySlug(slug: string) {
    const { data, error } = await supabase
      .from('equipment')
      .select(`
        *,
        merchant:merchant_profiles!inner(
          id,
          business_name,
          business_phone,
          verification_status
        ),
        images:equipment_images(image_url, is_primary, display_order),
        reviews:reviews(
          overall_rating,
          equipment_condition_rating,
          review_text,
          created_at,
          reviewer:users!inner(full_name)
        )
      `)
      .eq('slug', slug)
      .single();

    if (error) throw error;

    // Increment view count
    await supabase.rpc('increment_equipment_views', { equipment_id: data.id });

    return data;
  },

  /**
   * Get featured equipment
   */
  async getFeatured(limit = 12) {
    const { data, error } = await supabase
      .from('equipment')
      .select(`
        *,
        merchant:merchant_profiles!inner(business_name, verification_status),
        images:equipment_images(image_url, is_primary, display_order)
      `)
      .eq('verification_status', 'VERIFIED')
      .eq('is_featured', true)
      .eq('availability_status', 'AVAILABLE')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  /**
   * Save/unsave equipment (favorites)
   */
  async toggleSaved(equipmentId: string, userId: string) {
    // Check if already saved
    const { data: existing } = await supabase
      .from('saved_equipment')
      .select('id')
      .eq('user_id', userId)
      .eq('equipment_id', equipmentId)
      .single();

    if (existing) {
      // Remove from saved
      const { error } = await supabase
        .from('saved_equipment')
        .delete()
        .eq('id', existing.id);

      if (error) throw error;
      return { saved: false };
    } else {
      // Add to saved
      const { error } = await supabase
        .from('saved_equipment')
        .insert({ user_id: userId, equipment_id: equipmentId });

      if (error) throw error;
      return { saved: true };
    }
  },

  /**
   * Get user's saved equipment
   */
  async getSaved(userId: string) {
    const { data, error } = await supabase
      .from('saved_equipment')
      .select(`
        id,
        saved_at,
        equipment:equipment!inner(
          *,
          merchant:merchant_profiles!inner(business_name),
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
    const { data, error } = await supabase
      .from('equipment_availability')
      .select('*')
      .eq('equipment_id', equipmentId)
      .overlaps('blocked_from', 'blocked_to', [startDate.toISOString(), endDate.toISOString()]);

    if (error) throw error;

    return {
      isAvailable: data.length === 0,
      conflicts: data,
    };
  },
};
