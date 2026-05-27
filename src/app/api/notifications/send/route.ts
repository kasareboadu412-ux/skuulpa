import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * Generates the appropriate message text based on type.
 */
function buildMessage(
  messageType: string,
  student: Record<string, any>,
  additionalData?: Record<string, any>
): string {
  const studentName = `${student.first_name} ${student.last_name}`;
  const schoolName = additionalData?.school_name ?? "School";

  switch (messageType) {
    case "absence":
      return `*${schoolName}* — Absence Notification\n\nDear Parent, this is to inform you that *${studentName}* was marked absent today (${new Date().toLocaleDateString()}). Please contact the school for more details.`;

    case "fee_reminder": {
      const amount = additionalData?.amount ?? 0;
      return `*${schoolName}* — Fee Reminder\n\nDear Parent, this is a reminder that a fee of GHS ${Number(amount).toFixed(2)} is due for *${studentName}*. Please make payment at your earliest convenience to avoid late fees.`;
    }

    case "receipt": {
      const amount = additionalData?.amount ?? 0;
      const receiptNo = additionalData?.receipt_number ?? "";
      return `*${schoolName}* — Payment Receipt\n\nDear Parent, payment of GHS ${Number(amount).toFixed(2)} has been received for *${studentName}*.\nReceipt: ${receiptNo}\nThank you.`;
    }

    case "broadcast": {
      const message = additionalData?.message ?? "";
      return `*${schoolName}*\n\n${message}`;
    }

    default:
      return `*${schoolName}* — Notification for *${studentName}*`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { student_id, message_type, additional_data } = body;

    if (!student_id || !message_type) {
      return NextResponse.json(
        { error: "student_id and message_type are required" },
        { status: 400 }
      );
    }

    const validTypes = ["absence", "fee_reminder", "receipt", "broadcast"];
    if (!validTypes.includes(message_type)) {
      return NextResponse.json(
        { error: `message_type must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Get student info including parent phone
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("*, class:classes(*)")
      .eq("id", student_id)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Get school settings for sender config
    const { data: school } = await supabase
      .from("schools")
      .select("name, settings")
      .eq("id", student.school_id)
      .single();

    const schoolName = school?.name ?? "School";
    const settings = school?.settings as Record<string, any> ?? {};

    const message = buildMessage(message_type, student, {
      ...additional_data,
      school_name: schoolName,
    });

    const parentPhone = student.parent_primary_phone;
    const parentSecondaryPhone = student.parent_secondary_phone;

    // Determine notification channel from settings
    const channel = settings.notification_channel ?? "whatsapp";
    const targets: string[] = [parentPhone];
    if (parentSecondaryPhone) {
      targets.push(parentSecondaryPhone);
    }

    // Record the broadcast/log
    const { data: broadcast, error: broadcastError } = await supabase
      .from("whatsapp_broadcasts")
      .insert([
        {
          school_id: student.school_id,
          target: student_id,
          message_text: message,
          sent_count: targets.length,
          status: "sent",
        },
      ])
      .select("*")
      .single();

    if (broadcastError) {
      return NextResponse.json({ error: broadcastError.message }, { status: 400 });
    }

    return NextResponse.json({
      data: {
        broadcast,
        message,
        targets,
        channel,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
