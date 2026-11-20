import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getSupabaseServer } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────────────────────
// System prompt — strict Cheesco boundaries enforced at the server level
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are the Cheesco Equipment Assistant, a helpful and knowledgeable guide on the Cheesco Equip Hub platform (cheescoequiphub.com).
Cheesco connects contractors, builders, and project managers with verified equipment owners and trusted fleet partners across Nigeria.

CORE BOUNDARIES & STRICT RULES:
1. Platform Model: Cheesco is an intermediary platform connecting customers with equipment owners and partners. Cheesco is NOT the equipment owner.
2. Confidentiality: NEVER mention escrow under any circumstances.
3. Strict Truthfulness: You may search, recommend, and explain. You must NEVER invent or hallucinate prices, availability dates, specifications, or transaction status. If details are not available from the tool results, state clearly that you do not have that data.
4. No Transaction Authority: You CANNOT confirm rentals or sales, approve merchants, guarantee delivery dates, or mark payments received. No such tools exist. If the user asks to book, rent, buy, or get a quotation, explain the 6-step Cheesco workflow (Find → Request → Verify → Quotation → Confirm & Pay → Delivery) and direct them to the equipment listing page (/equipment/[slug]) or the Contact page (/support).
5. Availability: Only report what the listing availability field says (e.g. AVAILABLE, RESERVED, RENTED). Do not claim date-specific availability checks in this phase.
6. Tone & Style: Keep answers short, helpful, plain, and professional. Never use aggressive sales or pressure tactics.
7. Project Requests: When a user describes a project without enough details, ask only for the essential missing criteria (location in Nigeria, rent or buy, duration, capacity/size, budget). Once provided, call search_equipment to find real listings and explain why each matches.
8. Unsure: If you cannot find a matching listing or approved FAQ, state plainly that you are not certain and invite the user to reach Cheesco operations on the Contact page (/support).`;

// ─────────────────────────────────────────────────────────────────────────────
// OpenAI tools (function-calling schema)
// ─────────────────────────────────────────────────────────────────────────────
const TOOLS_CONFIG = [
  {
    type: "function",
    function: {
      name: "search_equipment",
      description:
        "Search live inventory of verified heavy equipment on Cheesco Equip Hub for rent or purchase.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description:
              "Category of equipment: Excavators, Cranes, Trucks, Bulldozers, Loaders, Generators, Lowbeds, Forklifts, Compactors, or Other.",
          },
          transaction_type: {
            type: "string",
            enum: ["FOR_RENT", "FOR_SALE", "FOR_SALE_AND_RENT"],
            description: "Whether the customer wants to rent or buy.",
          },
          location: {
            type: "string",
            description:
              "State or city in Nigeria (e.g. Lagos, Abuja, Rivers, Ogun, Kano, Delta, Port Harcourt).",
          },
          brand: {
            type: "string",
            description:
              "Brand or manufacturer (e.g. Caterpillar, Komatsu, JCB, Hitachi, Sany, Liebherr).",
          },
          condition: {
            type: "string",
            enum: ["NEW", "USED_EXCELLENT", "USED_GOOD", "USED_FAIR"],
            description: "Condition of the equipment.",
          },
          max_price: {
            type: "number",
            description:
              "Maximum rental rate per day or purchase price in Nigerian Naira (NGN).",
          },
          keywords: {
            type: "string",
            description: "Search keywords matching equipment name or model.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_equipment_details",
      description:
        "Retrieve verified technical specifications and operational terms for a specific equipment listing by its slug.",
      parameters: {
        type: "object",
        properties: {
          slug: {
            type: "string",
            description:
              "The unique slug of the equipment listing (e.g. 'caterpillar-320d-excavator-lagos').",
          },
        },
        required: ["slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_faq_answer",
      description:
        "Look up approved official Cheesco answers for questions on platform operations, merchant verification, rental/purchase steps, delivery, operators, inspections, sourcing, and contact.",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            description:
              "Keywords or topic name (e.g. 'how_cheesco_works', 'merchant_verification', 'rental_process', 'purchase_process', 'delivery_mobilization', 'operators', 'inspection_condition', 'sourcing_requests', 'pricing_rates', 'contact_support').",
          },
        },
        required: ["topic"],
      },
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Tool executor — all DB access via service-role Supabase client, server-side only
// ─────────────────────────────────────────────────────────────────────────────
async function executeTool(
  name: string,
  args: Record<string, any>,
  supabase: ReturnType<typeof getSupabaseServer>
): Promise<{ result: any; cards: any[] }> {
  const cards: any[] = [];

  if (name === "search_equipment") {
    let query = supabase
      .from("equipment")
      .select(
        `id, slug, name, category, brand, model, year, condition,
         location_state, location_city, listing_type,
         sale_price, cheesco_adjusted_rate,
         is_operator_included, is_delivery_available,
         availability_status, verification_status,
         images:equipment_images(image_url, is_primary)`
      )
      .eq("verification_status", "VERIFIED")
      .neq("availability_status", "MAINTENANCE")
      .limit(5);

    if (args.category) query = query.ilike("category", `%${args.category}%`);
    if (args.transaction_type)
      query = query.or(
        `listing_type.eq.${args.transaction_type},listing_type.eq.FOR_SALE_AND_RENT`
      );
    if (args.location)
      query = query.or(
        `location_state.ilike.%${args.location}%,location_city.ilike.%${args.location}%`
      );
    if (args.brand) query = query.ilike("brand", `%${args.brand}%`);
    if (args.condition) query = query.eq("condition", args.condition);
    if (args.max_price && Number(args.max_price) > 0) {
      const max = Number(args.max_price);
      query = query.or(
        `cheesco_adjusted_rate.lte.${max},sale_price.lte.${max}`
      );
    }
    if (args.keywords)
      query = query.or(
        `name.ilike.%${args.keywords}%,model.ilike.%${args.keywords}%`
      );

    const { data: rows, error } = await query;

    if (error || !rows?.length) {
      return {
        result: { count: 0, results: [], message: "No verified listings matched those criteria." },
        cards,
      };
    }

    const results = rows.map((r: any) => {
      const imageUrl =
        r.images?.find((i: any) => i.is_primary)?.image_url ||
        r.images?.[0]?.image_url ||
        "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=70";

      const card = {
        id: r.id,
        slug: r.slug,
        name: r.name,
        brand: r.brand,
        model: r.model,
        year: r.year,
        category: r.category,
        condition: r.condition,
        location: `${r.location_city ? r.location_city + ", " : ""}${r.location_state || "Nigeria"}`,
        listingType: r.listing_type,
        dailyRateNgn: r.cheesco_adjusted_rate,
        salePriceNgn: r.sale_price,
        isOperatorIncluded: Boolean(r.is_operator_included),
        isDeliveryAvailable: Boolean(r.is_delivery_available),
        availabilityStatus: r.availability_status,
        isVerified: true,
        imageUrl,
      };
      cards.push(card);

      return {
        name: r.name,
        slug: r.slug,
        brand: r.brand,
        model: r.model,
        location: card.location,
        listingType: r.listing_type,
        rateNgn: r.cheesco_adjusted_rate
          ? `₦${Number(r.cheesco_adjusted_rate).toLocaleString()}/day`
          : null,
        salePriceNgn: r.sale_price
          ? `₦${Number(r.sale_price).toLocaleString()}`
          : null,
        availability: r.availability_status,
        operatorIncluded: Boolean(r.is_operator_included),
        condition: r.condition,
      };
    });

    return { result: { count: results.length, results }, cards };
  }

  if (name === "get_equipment_details") {
    const { data: item, error } = await supabase
      .from("equipment")
      .select(
        `name, slug, brand, model, year, category, condition,
         location_state, location_city, description, specs, listing_type,
         cheesco_adjusted_rate, sale_price,
         is_operator_included, is_delivery_available,
         availability_status, verification_status`
      )
      .eq("slug", args.slug)
      .eq("verification_status", "VERIFIED")
      .maybeSingle();

    if (error || !item) {
      return {
        result: { found: false, message: `No verified equipment found with slug '${args.slug}'.` },
        cards,
      };
    }

    return {
      result: {
        found: true,
        name: item.name,
        brand: item.brand,
        model: item.model,
        year: item.year,
        category: item.category,
        condition: item.condition,
        location: `${item.location_city || ""}, ${item.location_state || ""}`,
        description: item.description,
        specs: item.specs || {},
        listingType: item.listing_type,
        dailyRateNgn: item.cheesco_adjusted_rate
          ? `₦${Number(item.cheesco_adjusted_rate).toLocaleString()}/day`
          : null,
        salePriceNgn: item.sale_price
          ? `₦${Number(item.sale_price).toLocaleString()}`
          : null,
        availabilityStatus: item.availability_status,
        operatorIncluded: Boolean(item.is_operator_included),
        deliveryAvailable: Boolean(item.is_delivery_available),
      },
      cards,
    };
  }

  if (name === "get_faq_answer") {
    const topic = args.topic || "";
    const { data: faqs, error } = await supabase
      .from("faq_entries")
      .select("topic, question, answer")
      .eq("published", true)
      .or(
        `topic.ilike.%${topic}%,question.ilike.%${topic}%,answer.ilike.%${topic}%`
      )
      .limit(2);

    if (error || !faqs?.length) {
      return {
        result: {
          found: false,
          message:
            "No specific approved FAQ found for this topic. Please invite the user to contact the Cheesco operations desk directly on the Contact page (/support).",
        },
        cards,
      };
    }

    return {
      result: {
        found: true,
        entries: faqs.map((f: any) => ({
          topic: f.topic,
          question: f.question,
          approvedAnswer: f.answer,
        })),
      },
      cards,
    };
  }

  return { result: { error: "Unknown tool" }, cards };
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);

  // Rate limiting: 20 messages / minute / IP
  const rateLimit = await checkRateLimit(`assistant_chat:${clientIp}`, 20, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        reply:
          "You have reached the temporary chat request limit. Please pause a moment before asking another question.",
        quickReplies: ["Talk to Our Team"],
        isRateLimited: true,
      },
      { status: 429 }
    );
  }

  const startTime = Date.now();

  try {
    const body = await request.json().catch(() => ({}));
    const {
      messages = [],
      sessionId = `sess-${Date.now().toString(36)}`,
    } = body;

    const openaiApiKey = process.env.OPENAI_API_KEY;

    // ── Graceful fallback when no key is configured ──────────────────────────
    if (!openaiApiKey) {
      return NextResponse.json({
        success: true,
        reply:
          "Welcome to Cheesco! You can browse our full verified machinery fleet on the Browse page, or reach our operations team at /support.",
        quickReplies: ["Browse Equipment", "Contact Operations"],
        equipmentCards: [],
        fallback: true,
        sessionId,
      });
    }

    const supabase = getSupabaseServer();

    // Build conversation with system prompt
    const conversation: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.slice(-10), // keep last 10 turns for context
    ];

    const allCards: any[] = [];
    const toolLog: any[] = [];

    // ── Agentic loop: up to 3 tool-call rounds ───────────────────────────────
    for (let round = 0; round < 3; round++) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: conversation,
          tools: TOOLS_CONFIG,
          tool_choice: "auto",
          temperature: 0.3,
          max_tokens: 600,
        }),
        signal: AbortSignal.timeout(20_000),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenAI error ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const assistantMsg = data.choices?.[0]?.message;
      if (!assistantMsg) throw new Error("Empty response from OpenAI");

      conversation.push(assistantMsg);

      // No tool calls → model has finished its reply
      if (!assistantMsg.tool_calls?.length) break;

      // Execute each tool call
      for (const tc of assistantMsg.tool_calls) {
        let args: Record<string, any> = {};
        try {
          args = JSON.parse(tc.function.arguments || "{}");
        } catch {
          args = {};
        }

        const { result, cards } = await executeTool(tc.function.name, args, supabase);
        allCards.push(...cards);
        toolLog.push({ tool: tc.function.name, args, result });

        conversation.push({
          role: "tool",
          tool_call_id: tc.id,
          name: tc.function.name,
          content: JSON.stringify(result),
        });
      }
    }

    // Extract final reply
    const lastMsg = conversation[conversation.length - 1];
    const finalReply =
      lastMsg?.role === "assistant" ? (lastMsg.content ?? "") : "";

    // Deduplicate equipment cards by slug
    const uniqueCards = Array.from(
      new Map(allCards.map((c) => [c.slug, c])).values()
    );

    // Log to chat_logs (non-blocking, best-effort)
    void supabase
      .from("chat_logs")
      .insert({
        session_id: sessionId,
        role: "assistant",
        content: finalReply,
        tool_calls: toolLog.length ? toolLog : null,
        response_ms: Date.now() - startTime,
      });

    return NextResponse.json({
      success: true,
      reply: finalReply,
      equipmentCards: uniqueCards,
      quickReplies:
        uniqueCards.length > 0
          ? ["Request a Quote", "Start New Search", "Talk to Our Team"]
          : ["Find Equipment", "Ask a Question", "Talk to Our Team"],
      sessionId,
    });
  } catch (err: any) {
    console.error("[Assistant Chat Error]:", err?.message);
    return NextResponse.json({
      success: false,
      reply:
        "Our assistant is temporarily unavailable. You can explore all verified equipment on our Browse page or contact our team directly.",
      quickReplies: ["Browse Equipment", "Talk to Our Team"],
      equipmentCards: [],
      fallback: true,
      sessionId: "",
    });
  }
}
