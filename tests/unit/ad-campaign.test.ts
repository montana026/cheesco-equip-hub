// Module-level mock must come before any imports that use supabaseServer
vi.mock('@/lib/supabase/server', () => {
  const mockFrom = vi.fn();
  return {
    supabaseServer: { from: mockFrom },
    getSupabaseServer: vi.fn(() => ({ from: mockFrom })),
    __mockFrom: mockFrom, // internal handle for per-test configuration
  };
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AD_PACKAGES, adPackageByType } from '@/lib/seed';
import { adCampaignService } from '@/lib/services/ad-campaign.service';

// Helper: build a chainable Supabase query mock
function buildQueryMock(resolvedValue: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(resolvedValue),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  return chain;
}

describe('Ad Campaign Service Suite', () => {
  describe('Promotional Packages Configuration', () => {
    it('defines all 4 standard promotional tiers with positive durations and prices', () => {
      expect(AD_PACKAGES.length).toBe(4);

      const hero = adPackageByType('HOMEPAGE_HERO_SPOTLIGHT');
      expect(hero.priceNgn).toBe(120000);
      expect(hero.durationDays).toBe(7);

      const featured = adPackageByType('HOMEPAGE_FEATURED_GRID');
      expect(featured.priceNgn).toBe(75000);
      expect(featured.durationDays).toBe(14);

      const category = adPackageByType('CATEGORY_TOP_BOOST');
      expect(category.priceNgn).toBe(50000);
      expect(category.durationDays).toBe(14);

      const search = adPackageByType('SEARCH_FIRST_PAGE');
      expect(search.priceNgn).toBe(50000);
      expect(search.durationDays).toBe(7);
    });
  });

  describe('Campaign Lifecycle & Validation', () => {
    it('rejects campaign creation when package type is invalid', async () => {
      await expect(
        adCampaignService.createCampaign('m-1', {
          equipmentId: 'eq-1',
          packageType: 'INVALID_PACKAGE' as any,
        })
      ).rejects.toThrow('Invalid ad package type');
    });

    it('rejects campaign creation when equipment does not belong to merchant', async () => {
      // Import the mocked module to access its `from` function
      const { supabaseServer } = await import('@/lib/supabase/server');

      // Configure the mock: equipment belongs to 'other-merchant', not 'my-merchant-id'
      (supabaseServer.from as ReturnType<typeof vi.fn>).mockReturnValueOnce(
        buildQueryMock({
          data: {
            id: 'eq-1',
            name: 'Cat 320D',
            merchant_id: 'other-merchant',
            verification_status: 'VERIFIED',
          },
          error: null,
        })
      );

      await expect(
        adCampaignService.createCampaign('my-merchant-id', {
          equipmentId: 'eq-1',
          packageType: 'CATEGORY_TOP_BOOST',
        })
      ).rejects.toThrow('Unauthorized: Equipment does not belong to your merchant profile');
    });
  });
});
