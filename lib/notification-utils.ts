/**
 * Pure, client-safe notification helpers.
 * Has ZERO dependencies on Supabase, Node server APIs, or secret environment variables.
 * Safe to import in both Client Components and Server Components.
 */

/**
 * Normalizes any notification link (including legacy/broken deep-links stored in DB)
 * so clicking 'View details' always lands on a valid existing page.
 */
export function normalizeNotificationLink(link?: string | null): string | undefined {
  if (!link || typeof link !== "string") return undefined;

  const cleaned = link.trim();
  if (!cleaned) return undefined;

  // 1. Admin operations: /admin/operations/rentals/:id or /admin/rentals/:id or /admin/operations/requests/:id
  const adminRentalMatch = cleaned.match(/^\/admin\/(?:operations\/)?(?:rentals|requests)\/([a-zA-Z0-9_-]+)/);
  if (adminRentalMatch) {
    return `/admin/operations?requestId=${adminRentalMatch[1]}`;
  }

  // 2. Customer rentals / requests / quotations:
  // e.g. /dashboard/customer/requests/:id or /dashboard/customer/rentals/:id or /dashboard/customer/quotations/:id
  const customerRentalMatch = cleaned.match(/^\/dashboard\/customer\/(?:requests|rentals|quotations)\/([a-zA-Z0-9_-]+)/);
  if (customerRentalMatch) {
    return `/dashboard/customer?requestId=${customerRentalMatch[1]}`;
  }

  // 3. Merchant rentals
  if (cleaned.startsWith("/merchant/rentals/")) {
    return "/merchant/dashboard";
  }

  return cleaned;
}
