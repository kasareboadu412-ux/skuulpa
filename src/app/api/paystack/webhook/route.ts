import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import crypto from "crypto";

export const runtime = "nodejs";

/**
 * POST /api/paystack/webhook
 *
 * Paystack calls this after a successful payment.
 * Verifies the signature, then upgrades the school's subscription.
 */
export async function POST(request: NextRequest) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY ?? "";

  const body = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";

  // Verify the request is genuinely from Paystack.
  const expectedSig = crypto
    .createHmac("sha512", secretKey)
    .update(body)
    .digest("hex");

  if (signature !== expectedSig) {
    console.error("Paystack webhook: invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const event = JSON.parse(body);

    if (event.event !== "charge.success") {
      // Acknowledge non-charge events without processing.
      return NextResponse.json({ received: true });
    }

    const { metadata, amount } = event.data;
    const { school_id, plan_id, billing } = metadata ?? {};

    if (!school_id || !plan_id) {
      console.error("Paystack webhook: missing metadata", metadata);
      return NextResponse.json({ received: true });
    }

    const db = getServiceClient();

    // Fetch plan to get its code.
    const { data: plan } = await db
      .from("subscription_plans")
      .select("id, code, price_monthly, price_yearly")
      .eq("id", plan_id)
      .maybeSingle();

    if (!plan) {
      console.error("Paystack webhook: plan not found", plan_id);
      return NextResponse.json({ received: true });
    }

    const planObj = plan as { id: string; code: string; price_monthly: number; price_yearly: number };

    // Calculate period dates.
    const now = new Date();
    const periodEnd = new Date(now);
    if (billing === "yearly") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Update (or create) the school's subscription.
    const { data: existingSub } = await db
      .from("school_subscriptions")
      .select("id")
      .eq("school_id", school_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const subData = {
      school_id,
      plan_id,
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      trial_ends_at: null,
      auto_renew: true,
      updated_at: now.toISOString(),
    };

    if (existingSub?.id) {
      await db.from("school_subscriptions").update(subData).eq("id", existingSub.id);
    } else {
      await db.from("school_subscriptions").insert({ ...subData });
    }

    // Mirror plan code on schools table for quick reads.
    await db.from("schools").update({
      subscription_plan: planObj.code,
      status: "active",
    }).eq("id", school_id);

    // Record invoice.
    const invoiceNum = `INV-${Date.now()}`;
    await db.from("invoices").insert({
      school_id,
      subscription_id: existingSub?.id ?? null,
      amount: amount / 100, // convert pesewas back to GHS
      currency: "GHS",
      status: "paid",
      period_start: now.toISOString().split("T")[0],
      period_end: periodEnd.toISOString().split("T")[0],
      paid_at: now.toISOString(),
      invoice_number: invoiceNum,
    });

    console.log(`Paystack webhook: school ${school_id} upgraded to ${planObj.code}`);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Paystack webhook error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
