// Supabase Edge Function: equipment-assistant
// Phase 1 Cheesco Equipment Assistant using OpenAI API with Function Calling (Tools)
// Deno runtime: https://deno.land/std@0.168.0/http/server.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_call_id?: string;
  name?: string;
  tool_calls?: any[];
}

const SYSTEM_PROMPT = `You are the Cheesco Equipment Assistant, a helpful and knowledgeable guide on the Cheesco Equip Hub platform (cheescoequiphub.com).
Cheesco connects contractors, builders, and project managers with verified equipment owners and trusted fleet partners across Nigeria.

CORE BOUNDARIES & STRICT RULES:
1. Platform Model: Cheesco is an intermediary platform connecting customers with equipment owners and partners. Cheesco is NOT the equipment owner.
2. Confidentiality: NEVER mention escrow under any circumstances.
3. Strict Truthfulness: You may search, recommend, and explain. You must NEVER invent or hallucinate prices, availability dates, specifications, or transaction status. If details are not available from the tool results, state clearly that you do not have that data.
4. No Transaction Authority: You CANNOT confirm rentals or sales, approve merchants, guarantee delivery dates, or mark payments received. No such tools exist. If the user asks to book, rent, buy, or get a quotation, explain the 6-step Cheesco workflow (Find, Request, Verify, Quotation, Confirm and Pay, Delivery) and direct them to the equipment listing page (/equipment/[slug]) or Contact page (/support).
5. Availability: Only report what the listing availability field says (e.g. AVAILABLE, RESERVED, RENTED). Do not claim date-specific availability checks in this phase.
6. Tone & Style: Keep answers short, helpful, plain, and professional. Never use aggressive sales or pressure tactics.
7. Project Requests: When a user describes a project without enough details, ask only for the essential missing criteria (location in Nigeria, rent or buy, duration, capacity/size, budget). Once provided, call search_equipment to find real listings and explain why each matches.
8. Unsure: If you cannot find a matching listing or approved FAQ, state plainly that you are not certain and invite the user to reach Cheesco operations on the Contact page (/support).`;

const TOOLS_CONFIG = [
  {
    type: "function",
    function: {
      name: "search_equipment",
      description: "Search live inventory of verified heavy equipment on Cheesco Equip Hub for rent or purchase.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Category of equipment: Excavators, Cranes, Trucks, Bulldozers, Loaders, Generators, Lowbeds, Forklifts, Compactors, or Other.",
          },
          transaction_type: {
            type: "string",
            enum: ["FOR_RENT", "FOR_SALE", "FOR_SALE_AND_RENT"],
            description: "Whether the customer wants to rent or buy.",
          },
          location: {
            type: "string",
            description: "State or city in Nigeria (e.g. Lagos, Abuja, Rivers, Ogun, Kano, Delta, Port Harcourt).",
          },
          brand: {
            type: "string",
            description: "Brand or manufacturer (e.g. Caterpillar, Komatsu, JCB, Hitachi, Sany, Liebherr).",
          },
          condition: {
            type: "string",
            enum: ["NEW", "USED_EXCELLENT", "USED_GOOD", "USED_FAIR"],
            description: "Condition of the equipment.",
          },
          max_price: {
            type: "number",
            description: "Maximum rental rate per day or purchase price in Nigerian Naira (NGN).",
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
      description: "Retrieve verified technical specifications and operational terms for a specific equipment listing by its slug.",
      parameters: {
        type: "object",
        properties: {
          slug: {
            type: "string",
            description: "The unique slug of the equipment listing (e.g. 'caterpillar-320d-excavator-lagos').",
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
      description: "Look up approved official Cheesco answers for questions on platform operations, merchant verification, rental/purchase steps, delivery, operators, inspections, sourcing, and contact.",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            description: "Keywords or topic name (e.g. 'how_cheesco_works', 'merchant_verification', 'rental_process', 'purchase_process', 'delivery_mobilization', 'operators', 'inspection_condition', 'sourcing_requests', 'pricing_rates', 'contact_support').",
          },
        },
        required: ["topic"],
      },
    },
  },
];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  let sessionId = "anon-" + Math.random().toString(36).substring(2, 9);

  try {
    const { messages = [], sessionId: reqSessionId } = await req.json();
    if (reqSessionId) sessionId = reqSessionId;

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({
          error: "OPENAI_API_KEY is not configured on the server.",
          fallback: true,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const conversation: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.slice(-10),
    ];

    let equipmentCards: any[] = [];
    let toolExecutionLog: any[] = [];

    let iterations = 0;
    while (iterations < 3) {
      iterations++;

      const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiApiKey}`,
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
      });

      if (!openAiRes.ok) {
        const errorText = await openAiRes.text();
        console.error("OpenAI API error:", errorText);
        throw new Error(`OpenAI API error: ${openAiRes.status} ${openAiRes.statusText}`);
      }

      const openAiData = await openAiRes.json();
      const choice = openAiData.choices?.[0];
      const assistantMsg = choice?.message;

      if (!assistantMsg) {
        throw new Error("Empty response from model");
      }

      conversation.push(assistantMsg);

      if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
        for (const toolCall of assistantMsg.tool_calls) {
          const fnName = toolCall.function.name;
          let fnArgs: Record<string, any> = {};
          try {
            fnArgs = JSON.parse(toolCall.function.arguments || "{}");
          } catch {
            fnArgs = {};
          }

          let toolResult: any = { error: "Unknown tool" };

          if (fnName === "search_equipment") {
            let query = supabase
              .from("equipment")
              .select(`
                id,
                slug,
                name,
                category,
                brand,
                model,
                year,
                condition,
                location_state,
                location_city,
                listing_type,
                sale_price,
                cheesco_adjusted_rate,
                is_operator_included,
                is_delivery_available,
                availability_status,
                verification_status,
                images:equipment_images(image_url, is_primary)
              `)
              .eq("verification_status", "VERIFIED")
              .neq("availability_status", "MAINTENANCE")
              .limit(5);

            if (fnArgs.category) {
              query = query.ilike("category", `%${fnArgs.category}%`);
            }
            if (fnArgs.transaction_type) {
              query = query.or(`listing_type.eq.${fnArgs.transaction_type},listing_type.eq.FOR_SALE_AND_RENT`);
            }
            if (fnArgs.location) {
              query = query.or(`location_state.ilike.%${fnArgs.location}%,location_city.ilike.%${fnArgs.location}%`);
            }
            if (fnArgs.brand) {
              query = query.ilike("brand", `%${fnArgs.brand}%`);
            }
            if (fnArgs.condition) {
              query = query.eq("condition", fnArgs.condition);
            }
            if (fnArgs.max_price && Number(fnArgs.max_price) > 0) {
              const maxVal = Number(fnArgs.max_price);
              query = query.or(`cheesco_adjusted_rate.lte.${maxVal},sale_price.lte.${maxVal}`);
            }
            if (fnArgs.keywords) {
              query = query.or(`name.ilike.%${fnArgs.keywords}%,model.ilike.%${fnArgs.keywords}%`);
            }

            const { data: equipRows, error: searchErr } = await query;

            if (searchErr) {
              toolResult = { results: [], count: 0, message: "Error querying equipment database." };
            } else {
              const results = (equipRows || []).map((row: any) => {
                const primaryImage =
                  row.images?.find((img: any) => img.is_primary)?.image_url ||
                  row.images?.[0]?.image_url ||
                  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=70";

                return {
                  id: row.id,
                  slug: row.slug,
                  name: row.name,
                  brand: row.brand,
                  model: row.model,
                  year: row.year,
                  category: row.category,
                  condition: row.condition,
                  location: `${row.location_city ? row.location_city + ", " : ""}${row.location_state || "Nigeria"}`,
                  listingType: row.listing_type,
                  dailyRateNgn: row.cheesco_adjusted_rate,
                  salePriceNgn: row.sale_price,
                  isOperatorIncluded: Boolean(row.is_operator_included),
                  isDeliveryAvailable: Boolean(row.is_delivery_available),
                  availabilityStatus: row.availability_status,
                  isVerified: row.verification_status === "VERIFIED",
                  imageUrl: primaryImage,
                };
              });

              toolResult = {
                count: results.length,
                results: results.map((r: any) => ({
                  name: r.name,
                  slug: r.slug,
                  brand: r.brand,
                  model: r.model,
                  location: r.location,
                  listingType: r.listingType,
                  rateNgn: r.dailyRateNgn ? `₦${Number(r.dailyRateNgn).toLocaleString()}/day` : null,
                  salePriceNgn: r.salePriceNgn ? `₦${Number(r.salePriceNgn).toLocaleString()}` : null,
                  availability: r.availabilityStatus,
                  operatorIncluded: r.isOperatorIncluded,
                  condition: r.condition,
                })),
              };

              equipmentCards.push(...results);
            }
          } else if (fnName === "get_equipment_details") {
            const { data: item, error: detailErr } = await supabase
              .from("equipment")
              .select(`
                name,
                slug,
                brand,
                model,
                year,
                category,
                condition,
                location_state,
                location_city,
                description,
                specs,
                listing_type,
                cheesco_adjusted_rate,
                sale_price,
                is_operator_included,
                is_delivery_available,
                availability_status,
                verification_status
              `)
              .eq("slug", fnArgs.slug)
              .eq("verification_status", "VERIFIED")
              .maybeSingle();

            if (detailErr || !item) {
              toolResult = { found: false, message: `No verified equipment found with slug '${fnArgs.slug}'.` };
            } else {
              toolResult = {
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
                dailyRateNgn: item.cheesco_adjusted_rate ? `₦${Number(item.cheesco_adjusted_rate).toLocaleString()}/day` : null,
                salePriceNgn: item.sale_price ? `₦${Number(item.sale_price).toLocaleString()}` : null,
                availabilityStatus: item.availability_status,
                operatorIncluded: Boolean(item.is_operator_included),
                deliveryAvailable: Boolean(item.is_delivery_available),
              };
            }
          } else if (fnName === "get_faq_answer") {
            const topicArg = fnArgs.topic || "";
            const { data: faqs, error: faqErr } = await supabase
              .from("faq_entries")
              .select("topic, question, answer")
              .eq("published", true)
              .or(`topic.ilike.%${topicArg}%,question.ilike.%${topicArg}%,answer.ilike.%${topicArg}%`)
              .limit(2);

            if (faqErr || !faqs || faqs.length === 0) {
              toolResult = {
                found: false,
                message: "No specific approved FAQ found for this topic. Please invite the user to contact the Cheesco operations desk directly on the Contact page (/support).",
              };
            } else {
              toolResult = {
                found: true,
                entries: faqs.map((f: any) => ({
                  topic: f.topic,
                  question: f.question,
                  approvedAnswer: f.answer,
                })),
              };
            }
          }

          toolExecutionLog.push({ tool: fnName, args: fnArgs, result: toolResult });

          conversation.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: fnName,
            content: JSON.stringify(toolResult),
          });
        }
      } else {
        break;
      }
    }

    const lastMessage = conversation[conversation.length - 1];
    const finalReply = lastMessage?.role === "assistant" ? lastMessage.content || "" : "";
    const responseDuration = Date.now() - startTime;

    const uniqueCards = Array.from(
      new Map(equipmentCards.map((c) => [c.slug, c])).values()
    );

    try {
      await supabase.from("chat_logs").insert({
        session_id: sessionId,
        role: "assistant",
        content: finalReply,
        tool_calls: toolExecutionLog.length > 0 ? toolExecutionLog : null,
        response_ms: responseDuration,
      });
    } catch (logErr) {
      console.warn("Failed to write chat log:", logErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        reply: finalReply,
        equipmentCards: uniqueCards,
        sessionId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Equipment Assistant Edge Function Error:", err);
    return new Response(
      JSON.stringify({
        error: "Our AI assistant is temporarily unavailable. Please browse machinery directly at /browse or contact support at /support.",
        fallback: true,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
