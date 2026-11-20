import { supabaseServer } from "@/lib/supabase/server";

export interface SupportTicketItem {
  id: string;
  reference: string;
  customerName: string;
  email: string;
  phone: string;
  category: string;
  subject: string;
  message: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | string;
  createdAt: string;
  replies?: Array<{
    id: string;
    sender: string;
    message: string;
    createdAt: string;
  }>;
}

function mapRowToTicket(row: any): SupportTicketItem {
  let customerName = row.user?.full_name || "Customer";
  let email = row.user?.email || "";
  let phone = row.user?.phone || "";
  let message = row.description || "";

  // Support both 3-part [From: Name | Email | Phone] and 4-part [From: Name | Email | Phone | Ref: X] headers
  const match = message.match(/^\[From:\s*([^|]*)\|\s*([^|]*)\|\s*([^|\]]*)(?:\|\s*([^\]]*))?\]\n\n([\s\S]*)$/);
  if (match) {
    const rawName = match[1]?.trim();
    const rawEmail = match[2]?.trim();
    const rawPhone = match[3]?.trim();
    // Prefer explicitly provided form data over linked system account names
    if (rawName && rawName !== "Anonymous") customerName = rawName;
    if (rawEmail) email = rawEmail;
    if (rawPhone) phone = rawPhone;
    message = match[5] || match[4] || "";
  }

  return {
    id: row.id,
    reference: row.ticket_number || `TCK-${row.id.slice(0, 8)}`,
    customerName,
    email,
    phone,
    category: row.category,
    subject: row.subject,
    message,
    priority: row.priority,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function getTickets(): Promise<SupportTicketItem[]> {
  const { data, error } = await supabaseServer
    .from("support_tickets")
    .select(`
      *,
      user:users!user_id(id, full_name, email, phone)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[support-tickets] Error fetching support tickets:", error);
    return [];
  }

  return (data || []).map(mapRowToTicket);
}

export async function createTicket(ticket: {
  reference: string;
  customerName: string;
  email: string;
  phone: string;
  category: string;
  subject: string;
  message: string;
  priority: string;
  userId?: string | null;
  referenceNumber?: string;
}): Promise<SupportTicketItem> {
  // 1. Resolve user_id: use explicitly passed userId or attempt case-insensitive email lookup
  let userId: string | null = ticket.userId || null;
  if (!userId && ticket.email) {
    const cleanEmail = ticket.email.trim().toLowerCase();
    const { data: user } = await supabaseServer
      .from("users")
      .select("id")
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (user?.id) {
      userId = user.id;
    }
  }

  // 2. Enforce canonical DB enum values
  const VALID_CATEGORIES = [
    "RENTAL",
    "PAYMENT",
    "EQUIPMENT",
    "DELIVERY",
    "MERCHANT",
    "DISPUTE",
    "ACCOUNT",
    "OTHER",
  ];
  const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

  const category = VALID_CATEGORIES.includes(ticket.category) ? ticket.category : "OTHER";
  const priority = VALID_PRIORITIES.includes(ticket.priority) ? ticket.priority : "MEDIUM";

  const refPart = ticket.referenceNumber ? ` | Ref: ${ticket.referenceNumber}` : "";
  const description = `[From: ${ticket.customerName || "Anonymous"} | ${ticket.email || ""} | ${ticket.phone || ""}${refPart}]\n\n${ticket.message}`;

  const insertPayload: any = {
    ticket_number: ticket.reference,
    user_id: userId,
    category,
    subject: ticket.subject,
    description,
    status: "OPEN",
    priority,
  };

  let { data, error } = await supabaseServer
    .from("support_tickets")
    .insert(insertPayload)
    .select(`
      *,
      user:users!user_id(id, full_name, email, phone)
    `)
    .maybeSingle();

  // 3. Fallback resilience: If user_id is NOT NULL in the live DB and submitter is anonymous/unregistered,
  // associate the ticket with a system admin so the customer request is never lost or dropped.
  if (error && !userId && (error.code === "23502" || error.message?.includes("not-null") || error.message?.includes("user_id"))) {
    console.warn("[support-tickets] user_id NOT NULL constraint active on DB; associating anonymous ticket with system user.");
    const { data: adminUser } = await supabaseServer
      .from("users")
      .select("id")
      .in("role", ["SUPER_ADMIN", "SUPPORT_ADMIN", "OPERATIONS_ADMIN"])
      .limit(1)
      .maybeSingle();

    const fallbackId = adminUser?.id || (await supabaseServer.from("users").select("id").limit(1).maybeSingle()).data?.id;

    if (fallbackId) {
      insertPayload.user_id = fallbackId;
      const retry = await supabaseServer
        .from("support_tickets")
        .insert(insertPayload)
        .select(`
          *,
          user:users!user_id(id, full_name, email, phone)
        `)
        .single();
      data = retry.data;
      error = retry.error;
    }
  }

  if (error || !data) {
    console.error("[support-tickets] Error creating support ticket in DB:", error);
    throw new Error(`Failed to persist support ticket: ${error?.message || "Unknown error"}`);
  }

  return mapRowToTicket(data);
}

export async function updateTicketStatus(id: string, status: string): Promise<SupportTicketItem | null> {
  const updates: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "RESOLVED" || status === "CLOSED") {
    updates.resolved_at = new Date().toISOString();
  }

  const { data, error } = await supabaseServer
    .from("support_tickets")
    .update(updates)
    .eq("id", id)
    .select(`
      *,
      user:users!user_id(id, full_name, email, phone)
    `)
    .maybeSingle();

  if (error || !data) {
    console.error("[support-tickets] Error updating ticket status:", error);
    return null;
  }

  return mapRowToTicket(data);
}

export async function addTicketReply(
  id: string,
  reply: { sender: string; message: string }
): Promise<SupportTicketItem | null> {
  const { data: current, error: fetchErr } = await supabaseServer
    .from("support_tickets")
    .select(`
      *,
      user:users!user_id(id, full_name, email, phone)
    `)
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !current) {
    console.error("[support-tickets] Ticket not found for reply:", fetchErr);
    return null;
  }

  const replyNote = `\n\n--- [Reply from ${reply.sender} at ${new Date().toISOString()}] ---\n${reply.message}`;
  const updatedDescription = (current.description || "") + replyNote;

  const { data: updated, error: updateErr } = await supabaseServer
    .from("support_tickets")
    .update({
      description: updatedDescription,
      status: "IN_PROGRESS",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(`
      *,
      user:users!user_id(id, full_name, email, phone)
    `)
    .maybeSingle();

  if (updateErr || !updated) {
    console.error("[support-tickets] Error saving ticket reply:", updateErr);
    return null;
  }

  return mapRowToTicket(updated);
}
