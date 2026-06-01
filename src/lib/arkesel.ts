/**
 * Arkesel SMS sender (Ghana).
 * Model A: each school provides its own API key + sender ID, so SMS costs are
 * billed directly to that school's Arkesel account.
 *
 * API: https://developers.arkesel.com (SMS API v2)
 */

/** Normalize a Ghana phone to international format Arkesel expects (233XXXXXXXXX). */
export function toArkeselPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("233")) return digits;
  if (digits.startsWith("0")) return "233" + digits.slice(1);
  if (digits.length === 9) return "233" + digits; // missing leading 0
  return digits;
}

export interface ArkeselResult {
  ok: boolean;
  sent: number;
  failed: number;
  error?: string;
  raw?: unknown;
}

/**
 * Send one SMS to many recipients via a school's Arkesel account.
 */
export async function sendArkeselSMS(opts: {
  apiKey: string;
  senderId: string;
  message: string;
  recipients: string[];
}): Promise<ArkeselResult> {
  const { apiKey, senderId, message } = opts;
  const recipients = Array.from(new Set(opts.recipients.map(toArkeselPhone).filter((r) => r.length >= 12)));

  if (recipients.length === 0) {
    return { ok: false, sent: 0, failed: 0, error: "No valid phone numbers" };
  }

  try {
    const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: senderId,
        message,
        recipients,
      }),
    });

    const data = await res.json().catch(() => ({}));

    // Arkesel returns { status: "success", data: [...] } on success.
    const success = res.ok && (data.status === "success" || data.code === "ok");
    if (!success) {
      const msg = data.message || data.status || `Arkesel error (HTTP ${res.status})`;
      return { ok: false, sent: 0, failed: recipients.length, error: String(msg), raw: data };
    }

    return { ok: true, sent: recipients.length, failed: 0, raw: data };
  } catch (err) {
    return { ok: false, sent: 0, failed: recipients.length, error: err instanceof Error ? err.message : "Network error" };
  }
}

/** Check an Arkesel account's SMS balance. */
export async function getArkeselBalance(apiKey: string): Promise<{ ok: boolean; balance?: string; error?: string }> {
  try {
    const res = await fetch("https://sms.arkesel.com/api/v2/clients/balance-details", {
      headers: { "api-key": apiKey },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.status !== "success") {
      return { ok: false, error: data.message || "Could not fetch balance" };
    }
    const bal = data.data?.sms_balance ?? data.data?.main_balance ?? "—";
    return { ok: true, balance: String(bal) };
  } catch {
    return { ok: false, error: "Network error" };
  }
}
