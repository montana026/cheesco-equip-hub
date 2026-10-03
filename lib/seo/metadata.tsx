import { Metadata } from 'next';

// 1. METADATA HELPER for unique page titles + meta descriptions
export function generatePageMetadata(
  title: string,
  description: string,
  image?: string,
  url?: string
): Metadata {
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      image: image || 'https://cheescoequiphub.com/og-image.jpg',
      url: url || 'https://cheescoequiphub.com',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image || 'https://cheescoequiphub.com/og-image.jpg'],
    },
  };
}

// 2. BREADCRUMB SCHEMA
export function BreadcrumbSchema({ items }: { items: Array<{ name: string; url: string }> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.url,
          })),
        }),
      }}
    />
  );
}

// 3. LOCAL BUSINESS SCHEMA
export function LocalBusinessSchema() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name: 'Cheesco Equip Hub',
          description: 'Heavy equipment marketplace and managed rental platform for Nigeria',
          image: 'https://cheescoequiphub.com/logo.jpg',
          url: 'https://cheescoequiphub.com',
          telephone: '+234-800-CHEESCO',
          email: 'support@cheescoequiphub.com',
          address: {
            '@type': 'PostalAddress',
            streetAddress: 'Lekki Phase 1',
            addressLocality: 'Lagos',
            addressRegion: 'Lagos',
            postalCode: '106104',
            addressCountry: 'NG',
          },
          geo: {
            '@type': 'GeoCoordinates',
            latitude: 6.426,
            longitude: 3.431,
          },
          priceRange: '₦₦₦',
          areaServed: 'NG',
        }),
      }}
    />
  );
}

// 4. ORGANIZATION SCHEMA
export function OrganizationSchema() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Cheesco Equip Hub',
          url: 'https://cheescoequiphub.com',
          logo: 'https://cheescoequiphub.com/logo.png',
          description: 'Nigeria\'s trusted marketplace for heavy equipment sales and managed rentals',
          sameAs: [
            'https://linkedin.com/company/cheesco',
            'https://twitter.com/cheesco',
            'https://facebook.com/cheesco',
          ],
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'Customer Support',
            telephone: '+234-800-CHEESCO',
            email: 'support@cheescoequiphub.com',
            areaServed: 'NG',
            availableLanguage: 'en',
          },
        }),
      }}
    />
  );
}
