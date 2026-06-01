import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireStaff } from "@/lib/auth-guard";
import { sendArkeselSMS } from "@/lib/arkesel";

export const runtime = "nodejs";

interface Recipient { phone: string; name: string }

/**
 * POST /api/messaging/send
 *
 * Body:
 *   { audience: "all" | "class" | "student", class_id?, student_id?, message }
 *
 * Resolves parent phone numbers, then either sends via the school's Arkesel
 * account (if configured) or returns mode:"manual" with the recipient list so
 * the client can fall back to free WhatsApp click-to-send.
 */
export async function POST(request: NextRequest) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId, userId, role } = auth;

  if (role !== "proprietor" && role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { audience, class_id, student_id, message } = body as {
      audience: string; class_id?: string; student_id?: string; message: string;
    };

    if (!message?.trim()) return NextResponse.json({ error: "Message is required" }, { status: 400 });

    const db = getServiceClient();

    // ── Resolve recipients ──
    let query = db
      .from("students")
      .select("first_name, last_name, parent_primary_phone, parent_secondary_phone")
      .eq("school_id", schoolId)
      .eq("status", "active");

    if (audience === "class" && class_id) query = query.eq("class_id", class_id);
    if (audience === "student" && student_id) query = query.eq("id", student_id);

    const { data: students } = await query;
    if (!students || students.length === 0) {
      return NextResponse.json({ error: "No recipients found" }, { status: 404 });
    }

    const recipients: Recipient[] = [];
    const seen = new Set<string>();
    for (const s of students) {
      const name = `${s.first_name} ${s.last_name}`;
      for (const phone of [s.parent_primary_phone, s.parent_secondary_phone]) {
        if (phone && !seen.has(phone)) {
          seen.add(phone);
          recipients.push({ phone, name });
        }
      }
    }

    // ── School messaging config ──
    const { data: school } = await db.from("schools").select("name, settings").eq("id", schoolId).maybeSingle();
    const settings = (school?.settings ?? {}) as Record<string, unknown>;
    const apiKey = (settings.arkesel_api_key as string) ?? "";
    const senderId = (settings.arkesel_sender_id as string) ?? "";

    // ── No Arkesel key → manual WhatsApp fallback ──
    if (!apiKey || !senderId) {
      return NextResponse.json({
        mode: "manual",
        recipients,
        message,
        reason: "SMS is not set up. Add your Arkesel API key in Settings → Messaging, or send via WhatsApp below.",
      });
    }

    // ── Send via Arkesel (billed to the school) ──
    const result = await sendArkeselSMS({
      apiKey,
      senderId,
      message,
      recipients: recipients.map((r) => r.phone),
    });

    const status = result.ok ? "sent" : result.sent > 0 ? "partial" : "failed";

    await db.from("whatsapp_broadcasts").insert({
      school_id: schoolId,
      sent_by: userId,
      target: audience === "class" ? (class_id ?? "class") : audience === "student" ? (student_id ?? "student") : "all_parents",
      message_text: message,
      sent_count: result.sent,
      failed_count: result.failed,
      status,
    });

    if (!result.ok) {
      return NextResponse.json({ mode: "sms", error: result.error || "SMS failed", sent: result.sent, failed: result.failed }, { status: 400 });
    }

    return NextResponse.json({ mode: "sms", sent: result.sent, failed: result.failed, recipients: recipients.length });
  } catch (err) {
    console.error("Messaging send error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** GET — recent message history for this school. */
export async function GET() {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth;

  const db = getServiceClient();
  const { data } = await db
    .from("whatsapp_broadcasts")
    .select("*")
    .eq("school_id", schoolId)
    .order("sent_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ data: data ?? [] });
}
