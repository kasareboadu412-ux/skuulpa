import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireStaff } from "@/lib/auth-guard";

export const runtime = "nodejs";

function buildMessage(messageType: string, student: Record<string, unknown>, additionalData?: Record<string, unknown>): string {
  const studentName = `${student.first_name} ${student.last_name}`;
  const schoolName = (additionalData?.school_name as string) ?? "School";

  switch (messageType) {
    case "absence":
      return `*${schoolName}* — Absence Notification\n\nDear Parent, this is to inform you that *${studentName}* was marked absent today (${new Date().toLocaleDateString()}). Please contact the school for more details.`;

    case "fee_reminder": {
      const amount = additionalData?.amount ?? 0;
      return `*${schoolName}* — Fee Reminder\n\nDear Parent, a fee of GHS ${Number(amount).toFixed(2)} is due for *${studentName}*. Please make payment at your earliest convenience.`;
    }

    case "receipt": {
      const amount = additionalData?.amount ?? 0;
      const receiptNo = additionalData?.receipt_number ?? "";
      return `*${schoolName}* — Payment Receipt\n\nDear Parent, payment of GHS ${Number(amount).toFixed(2)} has been received for *${studentName}*.\nReceipt: ${receiptNo}\nThank you.`;
    }

    case "broadcast": {
      const message = (additionalData?.message as string) ?? "";
      return `*${schoolName}*\n\n${message}`;
    }

    default:
      return `*${schoolName}* — Notification for *${studentName}*`;
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth;

  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { student_id, message_type, additional_data } = body;

    if (!student_id || !message_type) {
      return NextResponse.json({ error: "student_id and message_type are required" }, { status: 400 });
    }

    const validTypes = ["absence", "fee_reminder", "receipt", "broadcast"];
    if (!validTypes.includes(message_type)) {
      return NextResponse.json({ error: `message_type must be one of: ${validTypes.join(", ")}` }, { status: 400 });
    }

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("*, class:classes(*)")
      .eq("id", student_id)
      .eq("school_id", schoolId)
      .single();

    if (studentError || !student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const { data: school } = await supabase
      .from("schools")
      .select("name, settings")
      .eq("id", schoolId)
      .single();

    const schoolName = school?.name ?? "School";
    const settings = (school?.settings as Record<string, unknown>) ?? {};

    const message = buildMessage(message_type, student as Record<string, unknown>, { ...additional_data, school_name: schoolName });

    const targets: string[] = [student.parent_primary_phone];
    if (student.parent_secondary_phone) targets.push(student.parent_secondary_phone);

    const channel = (settings.notification_channel as string) ?? "whatsapp";

    const { data: broadcast, error: broadcastError } = await supabase
      .from("whatsapp_broadcasts")
      .insert([{ school_id: schoolId, target: student_id, message_text: message, sent_count: targets.length, status: "pending" }])
      .select("*")
      .single();

    if (broadcastError) return NextResponse.json({ error: "Failed to record broadcast" }, { status: 400 });
    return NextResponse.json({ data: { broadcast, message, targets, channel } });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
