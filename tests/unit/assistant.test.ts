import { describe, it, expect } from 'vitest';

describe('Cheesco Equipment Assistant - Phase 1 Specifications', () => {
  const SYSTEM_PROMPT_REQUIREMENTS = [
    'Cheesco connects contractors, builders, and project managers with verified equipment owners and trusted fleet partners across Nigeria.',
    'Cheesco is an intermediary platform connecting customers with equipment owners and partners. Cheesco is NOT the equipment owner.',
    'NEVER mention escrow under any circumstances.',
    'You may search, recommend, and explain. You must NEVER invent or hallucinate prices, availability dates, specifications, or transaction status.',
    'You CANNOT confirm rentals or sales, approve merchants, guarantee delivery dates, or mark payments received.',
    'Only report what the listing availability field says',
  ];

  const EXPECTED_FAQ_TOPICS = [
    'how_cheesco_works',
    'merchant_verification',
    'rental_process',
    'purchase_process',
    'delivery_mobilization',
    'operators',
    'inspection_condition',
    'sourcing_requests',
    'pricing_rates',
    'contact_support',
  ];

  it('prohibits mentioning escrow anywhere in system prompt rules', () => {
    const combinedRules = SYSTEM_PROMPT_REQUIREMENTS.join(' ');
    expect(combinedRules).toContain('NEVER mention escrow');
    // Ensure no positive promotion of escrow
    expect(combinedRules.toLowerCase()).not.toContain('escrow service');
    expect(combinedRules.toLowerCase()).not.toContain('held in escrow');
  });

  it('defines the strict platform intermediary model', () => {
    const combinedRules = SYSTEM_PROMPT_REQUIREMENTS.join(' ');
    expect(combinedRules).toContain('Cheesco is NOT the equipment owner');
  });

  it('defines the three designated Phase 1 tools', () => {
    const toolNames = ['search_equipment', 'get_equipment_details', 'get_faq_answer'];
    expect(toolNames).toContain('search_equipment');
    expect(toolNames).toContain('get_equipment_details');
    expect(toolNames).toContain('get_faq_answer');
    expect(toolNames).toHaveLength(3);
  });

  it('has all 10 required Phase 1 FAQ seed topics', () => {
    expect(EXPECTED_FAQ_TOPICS).toHaveLength(10);
    expect(EXPECTED_FAQ_TOPICS).toContain('how_cheesco_works');
    expect(EXPECTED_FAQ_TOPICS).toContain('merchant_verification');
    expect(EXPECTED_FAQ_TOPICS).toContain('rental_process');
    expect(EXPECTED_FAQ_TOPICS).toContain('purchase_process');
    expect(EXPECTED_FAQ_TOPICS).toContain('delivery_mobilization');
    expect(EXPECTED_FAQ_TOPICS).toContain('operators');
    expect(EXPECTED_FAQ_TOPICS).toContain('inspection_condition');
    expect(EXPECTED_FAQ_TOPICS).toContain('sourcing_requests');
    expect(EXPECTED_FAQ_TOPICS).toContain('pricing_rates');
    expect(EXPECTED_FAQ_TOPICS).toContain('contact_support');
  });
});
