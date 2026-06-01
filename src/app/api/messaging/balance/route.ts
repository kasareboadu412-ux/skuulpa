import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireStaff } from "@/lib/auth-guard";
import { getArkeselBalance } from "@/lib/arkesel";

export const runtime = "nodejs";

/** GET /api/messaging/balance — check the school's Arkesel SMS balance. */
export async function GET() {
  const auth = await requireStaff();
  if (auth instanceof NextResponse) return auth;
  const { schoolId } = auth;

  const db = getServiceClient();
  const { data: school } = await db.from("schools").select("settings").eq("id", schoolId).maybeSingle();
  const settings = (school?.settings ?? {}) as Record<string, unknown>;
  const apiKey = (settings.arkesel_api_key as string) ?? "";

  if (!apiKey) return NextResponse.json({ configured: false });

  const result = await getArkeselBalance(apiKey);
  return NextResponse.json({
    configured: true,
    sender_id: (settings.arkesel_sender_id as string) ?? "",
    ...result,
  });
}
