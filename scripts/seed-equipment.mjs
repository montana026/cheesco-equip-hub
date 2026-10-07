/**
 * Seed script — inserts the 12 seed equipment rows from lib/seed.ts into Supabase.
 * Run once: node scripts/seed-equipment.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vmnszggrtvzspquwcrjt.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbnN6Z2dydHZ6c3BxdXdjcmp0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDc3NDczMCwiZXhwIjoyMTA2MzUwNzMwfQ.miwctIlSYEs_qVu8zO-fiyh__T96OJBmQcnFvMRPVVs';

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const img = (seed) =>
  `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=1200&q=70`;

const seeds = [
  { id:'eq-001', name:'Liebherr LTM 1090-4.2 Mobile Crane',      category:'Cranes',      brand:'Liebherr',    model:'LTM 1090-4.2',   year:2021, condition:'USED_EXCELLENT', state:'Lagos',        city:'Ikeja',          hours:4200,  salePrice:1450000000, rent:850000,  listing:'FOR_SALE_AND_RENT', operator:true,  delivery:true,  promo:'HOMEPAGE_HERO_SPOTLIGHT', featured:true,  specs:{maxLiftCapacity:'90 t @ 3 m',boomReach:'52 m telescopic',enginePower:'360 kW',operatingWeight:'48 t'}, image:img('photo-1541888946425-d81bb19240f5'), blurb:'90-tonner with full luffing jib — site-proven on high-rise and refinery lifts.' },
  { id:'eq-002', name:'CAT 336 GC Hydraulic Excavator',           category:'Excavators',  brand:'Caterpillar', model:'336 GC',          year:2022, condition:'USED_EXCELLENT', state:'Rivers',       city:'Port Harcourt',  hours:3100,  salePrice:null,       rent:320000,  listing:'FOR_RENT',          operator:true,  delivery:true,  promo:'HOMEPAGE_FEATURED_GRID',  featured:true,  specs:{operatingWeight:'36 t',enginePower:'238 kW',boomReach:'6.5 m',fuelType:'Diesel'}, image:img('photo-1526835657244-e8a5c2c0e3c2'), blurb:'Fuel-efficient GC hydraulics — the workhorse for mass excavation.' },
  { id:'eq-003', name:'Manitowoc MLC100-1 Crawler Crane',         category:'Cranes',      brand:'Manitowoc',   model:'MLC100-1',        year:2019, condition:'USED_GOOD',      state:'Abuja (FCT)', city:'Gwarinpa',       hours:6800,  salePrice:null,       rent:1100000, listing:'FOR_RENT',          operator:true,  delivery:true,  promo:'NONE',                    featured:false, specs:{maxLiftCapacity:'110 t',boomReach:'72 m lattice',operatingWeight:'130 t'}, image:img('photo-1504307651254-356bf0ba29aa'), blurb:'Lattice-boom crawler for heavy process-module lifts.' },
  { id:'eq-004', name:'Sinotruk Howo 371 Tipper Truck',           category:'Trucks',      brand:'Sinotruk',    model:'Howo 371',        year:2021, condition:'USED_GOOD',      state:'Ogun',         city:'Sagamu',         hours:12500, salePrice:38000000,   rent:85000,   listing:'FOR_SALE_AND_RENT', operator:true,  delivery:true,  promo:'CATEGORY_TOP_BOOST',      featured:false, specs:{enginePower:'271 kW',fuelType:'Diesel'}, image:img('photo-1601584115197-04ecc0da31d7'), blurb:'10-cube tipper, fleet-maintained, ready for quarry runs.' },
  { id:'eq-005', name:'CAT D8T Bulldozer',                        category:'Bulldozers',  brand:'Caterpillar', model:'D8T',             year:2020, condition:'USED_GOOD',      state:'Kaduna',       city:'Kaduna South',   hours:5400,  salePrice:null,       rent:450000,  listing:'FOR_RENT',          operator:true,  delivery:true,  promo:'NONE',                    featured:false, specs:{operatingWeight:'39 t',enginePower:'266 kW',fuelType:'Diesel'}, image:img('photo-1567093324170-cb5d3be35a1c'), blurb:'Ripper-equipped dozer for clearing and bulk push.' },
  { id:'eq-006', name:'Perkins 1250 kVA Generator Set',           category:'Generators',  brand:'Perkins',     model:'4000 Series',     year:2022, condition:'NEW',            state:'Lagos',        city:'Lekki',          hours:120,   salePrice:95000000,   rent:260000,  listing:'FOR_SALE_AND_RENT', operator:false, delivery:true,  promo:'SEARCH_FIRST_PAGE',       featured:true,  specs:{enginePower:'1250 kVA standby',fuelType:'Diesel'}, image:img('photo-1581092160562-40aa08e78837'), blurb:'Containerized 1250 kVA genset with sync panel — event & plant power.' },
  { id:'eq-007', name:'Volvo L120H Wheel Loader',                  category:'Loaders',     brand:'Volvo CE',    model:'L120H',           year:2021, condition:'USED_EXCELLENT', state:'Oyo',          city:'Ibadan',         hours:2900,  salePrice:null,       rent:210000,  listing:'FOR_RENT',          operator:true,  delivery:true,  promo:'NONE',                    featured:false, specs:{operatingWeight:'22 t',enginePower:'180 kW'}, image:img('photo-1581094794329-c8112a89af12'), blurb:'High-lift loader with quick coupler and bucket options.' },
  { id:'eq-008', name:'Goldhofer 60-Ton Lowbed Trailer',           category:'Lowbeds',     brand:'Goldhofer',   model:'STZ-TL4',         year:2018, condition:'USED_GOOD',      state:'Delta',        city:'Warri',          hours:0,     salePrice:null,       rent:180000,  listing:'FOR_RENT',          operator:true,  delivery:true,  promo:'NONE',                    featured:false, specs:{maxLiftCapacity:'60 t deck load',operatingWeight:'24 t (trailer)'}, image:img('photo-1586191582056-b7f0a7f7dd55'), blurb:'4-axle hydraulic lowbed with ramps for plant haulage.' },
  { id:'eq-009', name:'Toyota 8FD30 Rough-Terrain Forklift',       category:'Forklifts',   brand:'Toyota',      model:'8FD30',           year:2020, condition:'USED_GOOD',      state:'Enugu',        city:'Emene',          hours:4100,  salePrice:null,       rent:95000,   listing:'FOR_RENT',          operator:false, delivery:true,  promo:'NONE',                    featured:false, specs:{maxLiftCapacity:'3 t @ 500 mm'}, image:img('photo-1586528116311-ad8dd5c8310d'), blurb:'3-ton pneumatic forklift for yards and laydown areas.' },
  { id:'eq-010', name:'Bomag BW 213 D-5 Vibratory Roller',        category:'Compactors',  brand:'Bomag',       model:'BW 213 D-5',      year:2021, condition:'USED_EXCELLENT', state:'Kano',         city:'Nassarawa GRA',  hours:2200,  salePrice:null,       rent:130000,  listing:'FOR_RENT',          operator:true,  delivery:true,  promo:'NONE',                    featured:false, specs:{operatingWeight:'13 t',enginePower:'112 kW'}, image:img('photo-1503387762-592deb58ef4e'), blurb:'13-ton smooth-drum roller for subgrade and asphalt.' },
  { id:'eq-011', name:'Komatsu PC490LC-11 Excavator',              category:'Excavators',  brand:'Komatsu',     model:'PC490LC-11',      year:2023, condition:'USED_EXCELLENT', state:'Akwa Ibom',    city:'Uyo',            hours:1500,  salePrice:620000000,  rent:480000,  listing:'FOR_SALE_AND_RENT', operator:true,  delivery:true,  promo:'NONE',                    featured:false, specs:{operatingWeight:'49 t',enginePower:'270 kW',boomReach:'7.1 m'}, image:img('photo-1590494165264-1ebe3602eb80'), blurb:'Late-model 49-tonner with Grade Control ready hydraulics.' },
  { id:'eq-012', name:'XCMG XCA220 All-Terrain Crane',             category:'Cranes',      brand:'XCMG',        model:'XCA220',          year:2022, condition:'NEW',            state:'Abuja (FCT)', city:'Central Area',   hours:350,   salePrice:2100000000, rent:1500000, listing:'FOR_SALE_AND_RENT', operator:true,  delivery:true,  promo:'NONE',                    featured:true,  specs:{maxLiftCapacity:'220 t',boomReach:'68 m',enginePower:'440 kW'}, image:img('photo-1547650272-1ea2b48a2f11'), blurb:'220-ton all-terrain crane — wind-farm and tower-build spec.' },
];

const PROMO_ORDER = { HOMEPAGE_HERO_SPOTLIGHT:0, HOMEPAGE_FEATURED_GRID:1, CATEGORY_TOP_BOOST:2, SEARCH_FIRST_PAGE:3, NONE:9 };

async function main() {
  console.log('🌱 Starting equipment seed...\n');

  // 1. Ensure a system merchant profile exists
  const SYSTEM_MERCHANT_EMAIL = 'system-merchant@cheesco.ng';
  let merchantId;

  // Check if system user already exists
  const { data: existingUsers } = await sb.auth.admin.listUsers();
  let systemUser = existingUsers?.users?.find(u => u.email === SYSTEM_MERCHANT_EMAIL);

  if (!systemUser) {
    console.log('Creating system merchant auth user...');
    const { data: created, error } = await sb.auth.admin.createUser({
      email: SYSTEM_MERCHANT_EMAIL,
      password: 'Ch33sc0-System-2026!',
      email_confirm: true,
    });
    if (error) { console.error('Auth create error:', error.message); process.exit(1); }
    systemUser = created.user;
  }

  // Upsert user profile
  await sb.from('users').upsert({
    id: systemUser.id,
    email: SYSTEM_MERCHANT_EMAIL,
    full_name: 'Cheesco Verified Fleet',
    role: 'MERCHANT',
  }, { onConflict: 'id' });

  // Upsert merchant profile
  const { data: mp, error: mpErr } = await sb.from('merchant_profiles').upsert({
    user_id: systemUser.id,
    business_name: 'Cheesco Verified Fleet',
    verification_status: 'VERIFIED',
    verified_at: new Date().toISOString(),
  }, { onConflict: 'user_id' }).select('id').single();

  if (mpErr) { console.error('Merchant profile error:', mpErr.message); process.exit(1); }
  merchantId = mp.id;
  console.log(`✓ System merchant ready (id: ${merchantId})\n`);

  // 2. Insert equipment
  for (const s of seeds) {
    const slug = s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const hasPromo = s.promo !== 'NONE';

    const row = {
      merchant_id: merchantId,
      slug,
      name: s.name,
      category: s.category,
      brand: s.brand,
      model: s.model,
      year: s.year,
      condition: s.condition,
      location_state: s.state,
      location_city: s.city,
      operating_hours: s.hours,
      description: s.blurb,
      specs: s.specs,
      listing_type: s.listing,
      sale_price: s.salePrice ?? null,
      merchant_rental_rate: s.rent,
      cheesco_adjusted_rate: Math.round(s.rent * 1.15),
      is_operator_included: s.operator,
      is_delivery_available: s.delivery,
      verification_status: 'VERIFIED',
      availability_status: 'AVAILABLE',
      is_featured: !!s.featured,
      promotion_tier: s.promo,
      promotion_expires_at: hasPromo ? new Date(Date.now() + 7 * 86400000).toISOString() : null,
    };

    const { data: eq, error: eqErr } = await sb
      .from('equipment')
      .upsert(row, { onConflict: 'slug' })
      .select('id')
      .single();

    if (eqErr) {
      console.error(`✗ ${s.name}: ${eqErr.message}`);
      continue;
    }

    // Insert primary image
    await sb.from('equipment_images').upsert({
      equipment_id: eq.id,
      image_url: s.image,
      is_primary: true,
      display_order: 0,
    }, { onConflict: 'equipment_id,display_order' });

    console.log(`✓ ${s.name} (${s.state})`);
  }

  console.log('\n✅ Seed complete! Equipment is now live in the database.');
}

main().catch(e => { console.error(e); process.exit(1); });
