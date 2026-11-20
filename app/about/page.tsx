import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generatePageMetadata(
  'About Us | Cheesco Equip Hub — Powering Progress with the Right Equipment',
  'Africa\'s trusted heavy equipment marketplace and managed rental platform, connecting businesses and individuals with reliable equipment, verified partners and seamless logistics.',
  undefined,
  'https://cheescoequiphub.com/about'
);

const STATS = [
  { value: '5+', label: 'Years of Experience' },
  { value: '1,000+', label: 'Equipment Listings' },
  { value: '500+', label: 'Happy Clients' },
  { value: '100%', label: 'Commitment to Service' },
];

const WHY_CHOOSE_ITEMS = [
  {
    title: 'Verified Equipment & Merchants',
    description: 'We verify all equipment and partners to ensure authenticity, quality and reliability.',
    icon: (
      <svg className="h-6 w-6 text-cheesco-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      </svg>
    ),
  },
  {
    title: 'Secure Transactions',
    description: 'Your payments and data are protected with industry-leading security measures.',
    icon: (
      <svg className="h-6 w-6 text-cheesco-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    title: 'End-to-End Support',
    description: 'From enquiry to delivery, our team is with you every step of the way.',
    icon: (
      <svg className="h-6 w-6 text-cheesco-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
      </svg>
    ),
  },
  {
    title: 'Nationwide Logistics',
    description: 'We coordinate fast and reliable delivery through our trusted logistics partners.',
    icon: (
      <svg className="h-6 w-6 text-cheesco-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.215-9.115A1.125 1.125 0 0017.568 8.25H15M2.25 14.25v-8.25c0-.621.504-1.125 1.125-1.125h11.25c.621 0 1.125.504 1.125 1.125v8.25m-13.5 0h13.5" />
      </svg>
    ),
  },
  {
    title: 'Wide Range of Equipment',
    description: 'Access a diverse fleet of heavy equipment for sale or rent, across multiple categories.',
    icon: (
      <svg className="h-6 w-6 text-cheesco-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.11v-1.093c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    title: 'Transparent & Fair Pricing',
    description: 'Get competitive rates with no hidden fees.',
    icon: (
      <svg className="h-6 w-6 text-cheesco-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.386a19.78 19.78 0 006.126-6.126c.486-.827.313-1.908-.386-2.607L12.007 3.66A2.25 2.25 0 0010.415 3H9.568z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
      </svg>
    ),
  },
];

const SERVICES = [
  {
    title: 'Equipment Sales',
    description: 'Buy new and used heavy equipment from trusted merchants.',
    image: '/images/sales.jpg',
    href: '/browse?tab=for-sale',
    icon: (
      <svg className="h-4 w-4 text-[#0A0D14]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25c-.669 0-1.189-.578-1.119-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
  },
  {
    title: 'Equipment Rentals',
    description: 'Flexible rental options for short and long-term projects.',
    image: '/images/rentals.jpg',
    href: '/browse?tab=for-rent',
    icon: (
      <svg className="h-4 w-4 text-[#0A0D14]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
      </svg>
    ),
  },
  {
    title: 'Logistics & Delivery',
    description: 'Safe and timely delivery to your project location.',
    image: '/images/Logistics.jpg',
    href: '/how-it-works',
    icon: (
      <svg className="h-4 w-4 text-[#0A0D14]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.215-9.115A1.125 1.125 0 0017.568 8.25H15M2.25 14.25v-8.25c0-.621.504-1.125 1.125-1.125h11.25c.621 0 1.125.504 1.125 1.125v8.25m-13.5 0h13.5" />
      </svg>
    ),
  },
  {
    title: 'Operator Services',
    description: 'Get certified and experienced operators for your equipment.',
    image: '/images/Operator.jpg',
    href: '/contact',
    icon: (
      <svg className="h-4 w-4 text-[#0A0D14]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
];

const TEAM_MEMBERS = [
  {
    name: 'Obiano Francis',
    role: 'CEO & Founder',
    image: '/images/team/ceo.jpg',
  },
  {
    name: 'Samuel Anthony',
    role: 'Social Media Manager / Web Developer',
    image: '/images/team/anthony.jpg',
  },
  {
    name: 'Oloro Oghenetega Samuel',
    role: 'Video Editor',
    image: '/images/team/tega.jpg',
  },
  {
    name: 'OGOLO TAMMY MONDAY',
    role: 'Graphic Designer',
    image: '/images/team/sammy.jpg',
  },
];

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        {/* ── 1. HERO SECTION (Dark background with Mobile Crane Backdrop) ── */}
        <section className="relative min-h-[540px] lg:min-h-[600px] flex items-center bg-[#0B0F19] text-white pt-24 pb-16 overflow-hidden">
          {/* Hero Background Image */}
          <div className="absolute inset-0 z-0">
            <Image
              src='/images/about/hero.jpg'
              alt="Mobile crane on construction site at sunset"
              fill
              priority
              className="object-cover object-center opacity-40 mix-blend-luminosity brightness-95"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0B0F19] via-[#0B0F19]/85 to-[#0B0F19]/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-transparent to-transparent" />
          </div>

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
              <div className="max-w-2xl">
                {/* Section Tag */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="h-0.5 w-6 bg-cheesco-yellow" />
                  <span className="text-xs font-bold uppercase tracking-widest text-cheesco-yellow">
                    ABOUT US
                  </span>
                </div>

                {/* Hero Title */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] mb-6">
                  Powering Progress <br />
                  with the <span className="text-cheesco-yellow">Right Equipment</span>
                </h1>

                {/* Hero Subtitle */}
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed mb-8 max-w-xl">
                  Cheesco Equip Hub is Africa&apos;s trusted heavy equipment marketplace and managed rental platform, connecting businesses and individuals with reliable equipment, verified partners and seamless logistics.
                </p>

                {/* Hero Action Buttons */}
                <div className="flex flex-wrap items-center gap-3.5">
                  <Link
                    href="/browse"
                    className="inline-flex items-center gap-2 rounded-xl bg-cheesco-yellow px-6 py-3.5 text-xs font-black text-[#0A0D14] shadow-lg shadow-cheesco-yellow/20 transition-all hover:bg-cheesco-yellow-bright hover:scale-[1.02] hover:shadow-xl"
                  >
                    Browse Equipment
                    <span className="text-sm font-bold">→</span>
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900/60 backdrop-blur-sm px-6 py-3.5 text-xs font-bold text-white transition-all hover:bg-zinc-800 hover:border-zinc-500"
                  >
                    Get In Touch
                  </Link>
                </div>
              </div>

              {/* Top-right subtle brand tagline */}
              <div className="hidden lg:block text-right pt-4">
                <p className="text-xs font-semibold text-zinc-400 tracking-wider uppercase leading-relaxed">
                  Better <br />
                  Equipment. <br />
                  <span className="text-white font-bold">Bigger</span> <br />
                  Possibilities.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. OUR STORY SECTION (Clean light slate canvas with stats & quote image) ── */}
        <section className="py-20 bg-canvas text-ink">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Story text & stats */}
              <div className="lg:col-span-6 space-y-6">
                <div className="flex items-center gap-2">
                  <span className="h-0.5 w-6 bg-cheesco-yellow" />
                  <span className="text-xs font-bold uppercase tracking-widest text-cheesco-yellow">
                    OUR STORY
                  </span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-black text-ink tracking-tight leading-tight">
                  Built on Trust, <br />
                  <span className="text-cheesco-yellow">Driven by Impact</span>
                </h2>

                <div className="space-y-4 text-xs sm:text-sm text-ink-muted leading-relaxed">
                  <p>
                    Cheesco Equip Hub was founded with a simple mission — to make heavy equipment more accessible, reliable and efficient for businesses across Nigeria and Africa. We understand the challenges of sourcing and renting equipment, which is why we built a platform that connects you with trusted merchants, verified equipment and a team that handles the entire process from request to delivery.
                  </p>
                  <p>
                    Our goal is to reduce downtime, eliminate uncertainty and help businesses move forward with confidence.
                  </p>
                </div>

                {/* 4 Stats in a grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-line-soft">
                  {STATS.map((stat) => (
                    <div key={stat.label}>
                      <div className="text-2xl sm:text-3xl font-black text-cheesco-yellow tracking-tight">
                        {stat.value}
                      </div>
                      <div className="text-[11px] font-medium text-ink-muted mt-0.5">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Hero Image with Quote Card */}
              <div className="lg:col-span-6">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-line-soft aspect-[4/3] sm:aspect-[16/11]">
                  <Image
                    src="/images/whyus.jpg"
                    alt="Engineer on construction site wearing helmet and hi-vis vest"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19]/90 via-[#0B0F19]/30 to-transparent" />

                  {/* Floating Quote Box */}
                  <div className="absolute bottom-6 left-6 right-6 sm:max-w-md bg-[#0B0F19]/90 backdrop-blur-md rounded-2xl p-5 border border-zinc-700/80 shadow-2xl">
                    <span className="text-3xl font-serif text-cheesco-yellow leading-none block mb-1">“</span>
                    <p className="text-xs font-semibold text-white leading-relaxed mb-2">
                      We&apos;re not just providing equipment, we&apos;re enabling businesses to build a better future.
                    </p>
                    <p className="text-[11px] font-bold text-cheesco-yellow tracking-wide">
                      — The Cheesco Team
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. WHY CHOOSE US (Dark Navy Section with 6 Feature Badges) ── */}
        <section className="py-20 bg-[#0B0F19] text-white border-y border-zinc-800/80">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              {/* Left Column: Heading & CTA */}
              <div className="lg:col-span-4 space-y-6">
                <div className="flex items-center gap-2">
                  <span className="h-0.5 w-6 bg-cheesco-yellow" />
                  <span className="text-xs font-bold uppercase tracking-widest text-cheesco-yellow">
                    WHY CHOOSE US
                  </span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                  Your Trusted Partner <br />
                  in <span className="text-cheesco-yellow">Heavy Equipment</span>
                </h2>

                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  We go beyond just listings. We provide a complete, secure and managed experience designed around your needs.
                </p>

                <div className="pt-2">
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 rounded-xl bg-cheesco-yellow px-6 py-3.5 text-xs font-black text-[#0A0D14] shadow-lg shadow-cheesco-yellow/20 transition-all hover:bg-cheesco-yellow-bright hover:scale-[1.02]"
                  >
                    Get Started
                    <span className="text-sm font-bold">→</span>
                  </Link>
                </div>
              </div>

              {/* Right Column: 6 Features Grid */}
              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                {WHY_CHOOSE_ITEMS.map((item) => (
                  <div
                    key={item.title}
                    className="flex gap-4 p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-cheesco-yellow/40 transition-all"
                  >
                    <div className="flex-shrink-0 flex h-11 w-11 items-center justify-center rounded-xl bg-cheesco-yellow/10 border border-cheesco-yellow/20">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white mb-1.5">{item.title}</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. COMPLETE EQUIPMENT SOLUTIONS (4 Cards Grid) ── */}
        <section className="py-20 bg-canvas text-ink">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Header with Title and Button */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
              <div className="max-w-xl space-y-3">
                <div className="flex items-center gap-2">
                  <span className="h-0.5 w-6 bg-cheesco-yellow" />
                  <span className="text-xs font-bold uppercase tracking-widest text-cheesco-yellow">
                    OUR SERVICES
                  </span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-ink tracking-tight">
                  Complete Equipment Solutions <br />
                  for Every Project
                </h2>
                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                  We provide more than just equipment. We offer a full suite of services to keep your projects moving, on time and on budget.
                </p>
              </div>

              <Link
                href="/browse"
                className="inline-flex items-center gap-2 rounded-xl bg-cheesco-yellow px-5 py-3 text-xs font-black text-[#0A0D14] shadow-md hover:bg-cheesco-yellow-bright transition-all whitespace-nowrap self-start sm:self-auto"
              >
                Explore All Services
                <span className="text-sm font-bold">→</span>
              </Link>
            </div>

            {/* 4 Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {SERVICES.map((svc) => (
                <div
                  key={svc.title}
                  className="card-surface rounded-2xl overflow-hidden border border-line-soft shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image
                      src={svc.image}
                      alt={svc.title}
                      fill
                      className="object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <div className="absolute top-3 left-3 flex h-8 w-8 items-center justify-center rounded-lg bg-cheesco-yellow shadow-md">
                      {svc.icon}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-black text-ink mb-1.5">{svc.title}</h3>
                      <p className="text-xs text-ink-muted leading-relaxed mb-4">{svc.description}</p>
                    </div>

                    <Link
                      href={svc.href}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-cheesco-yellow hover:text-cheesco-yellow-dim transition-colors pt-2 border-t border-line-soft"
                    >
                      Learn More
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. OUR TEAM (5 Cards in a Row) ── */}
        <section className="py-20 bg-canvas-deep/40 text-ink border-t border-line-soft">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
              <div className="max-w-xl space-y-3">
                <div className="flex items-center gap-2">
                  <span className="h-0.5 w-6 bg-cheesco-yellow" />
                  <span className="text-xs font-bold uppercase tracking-widest text-cheesco-yellow">
                    OUR TEAM
                  </span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-ink tracking-tight">
                  The People Behind <br />
                  <span className="text-cheesco-yellow">Cheesco Equip Hub</span>
                </h2>
                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                  Our team is made up of industry experts, operations professionals, engineers and customer support specialists, all working together to deliver the best equipment solutions for our clients.
                </p>
              </div>

              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl bg-cheesco-yellow px-5 py-3 text-xs font-black text-[#0A0D14] shadow-md hover:bg-cheesco-yellow-bright transition-all whitespace-nowrap self-start sm:self-auto"
              >
                Meet Our Team
                <span className="text-sm font-bold">→</span>
              </Link>
            </div>

            {/* 4 Members Grid (Centered) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {TEAM_MEMBERS.map((member) => (
                <div
                  key={member.name}
                  className="card-surface rounded-2xl overflow-hidden border border-line-soft p-4 text-center shadow-sm hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-square rounded-xl overflow-hidden mb-3.5 bg-canvas-deep">
                      <Image
                        src={member.image}
                        alt={member.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <h3 className="text-xs font-black text-ink tracking-tight">{member.name}</h3>
                    <p className="text-[11px] font-medium text-ink-muted mt-0.5">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 6. BOTTOM CTA BANNER (Ready to Get the Right Equipment for Your Project?) ── */}
        <section className="relative py-20 bg-[#0A0D14] text-white overflow-hidden">
          {/* Construction Silhouette Background */}
          <div className="absolute inset-0 z-0">
            <Image
              src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=2000&q=80"
              alt="Night construction site backdrop"
              fill
              className="object-cover object-bottom opacity-20 mix-blend-luminosity brightness-75"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0D14] via-[#0A0D14]/90 to-[#0A0D14]/80" />
          </div>

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 pb-12 border-b border-zinc-800">
              <div className="max-w-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <span className="h-0.5 w-6 bg-cheesco-yellow" />
                  <span className="text-xs font-bold uppercase tracking-widest text-cheesco-yellow">
                    LET&apos;S WORK TOGETHER
                  </span>
                </div>

                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                  Ready to Get the Right <br />
                  Equipment for <span className="text-cheesco-yellow">Your Project?</span>
                </h2>

                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-xl">
                  Join thousands of businesses already using Cheesco Equip Hub to get the equipment they need, when they need it.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3.5">
                <Link
                  href="/browse"
                  className="inline-flex items-center gap-2 rounded-xl bg-cheesco-yellow px-6 py-3.5 text-xs font-black text-[#0A0D14] shadow-lg shadow-cheesco-yellow/20 transition-all hover:bg-cheesco-yellow-bright hover:scale-[1.02]"
                >
                  Browse Equipment
                  <span className="text-sm font-bold">→</span>
                </Link>
                <Link
                  href="/register?role=MERCHANT"
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900/80 px-6 py-3.5 text-xs font-bold text-white transition-all hover:bg-zinc-800 hover:border-zinc-500"
                >
                  List Your Equipment
                </Link>
              </div>
            </div>

            {/* Bottom 3 Trust Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-10 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-3 text-zinc-300">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cheesco-yellow/10 text-cheesco-yellow border border-cheesco-yellow/20">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-white tracking-wide">Build Faster</span>
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-3 text-zinc-300">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cheesco-yellow/10 text-cheesco-yellow border border-cheesco-yellow/20">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.11v-1.093c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-white tracking-wide">Work Smarter</span>
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-3 text-zinc-300">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cheesco-yellow/10 text-cheesco-yellow border border-cheesco-yellow/20">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-white tracking-wide">Grow Together</span>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
