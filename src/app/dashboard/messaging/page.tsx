"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { MessageSquare, Send, Loader2, MessageCircle, Wallet, AlertCircle, CheckCircle2 } from "lucide-react";

interface ClassRow { id: string; name: string }

const TEMPLATES: { label: string; text: string }[] = [
  { label: "Custom message", text: "" },
  { label: "Fee reminder", text: "Dear Parent, this is a reminder that school fees are due. Kindly make payment at your earliest convenience. Thank you." },
  { label: "Reopening date", text: "Dear Parent, school reopens on [DATE]. Please ensure your child resumes on time. Thank you." },
  { label: "PTA meeting", text: "Dear Parent, there will be a PTA meeting on [DATE] at [TIME]. Your attendance is highly appreciated." },
  { label: "Holiday notice", text: "Dear Parent, the school will be closed on [DATE] for [REASON]. Normal classes resume on [DATE]." },
];

function toIntlPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("233")) return d;
  if (d.startsWith("0")) return "233" + d.slice(1);
  return d;
}

export default function MessagingPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [audience, setAudience] = useState("all");
  const [classId, setClassId] = useState("");
  const [message, setMessage] = useState("");
  const [template, setTemplate] = useState("0");
  const [sending, setSending] = useState(false);
  const [smsConfigured, setSmsConfigured] = useState<boolean | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ id: string; message_text: string; sent_count: number; failed_count: number; status: string; sent_at: string; target: string }>>([]);
  const [manualRecipients, setManualRecipients] = useState<Array<{ phone: string; name: string }> | null>(null);

  const load = useCallback(async () => {
    try {
      const [cRes, balRes, hRes] = await Promise.all([
        fetch("/api/classes"),
        fetch("/api/messaging/balance"),
        fetch("/api/messaging/send"),
      ]);
      const [cData, balData, hData] = await Promise.all([cRes.json(), balRes.json(), hRes.json()]);
      if (cRes.ok) setClasses((cData.data ?? []).map((c: ClassRow) => ({ id: c.id, name: c.name })));
      if (balRes.ok) { setSmsConfigured(balData.configured); setBalance(balData.balance ?? null); }
      if (hRes.ok) setHistory(hData.data ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSend = async () => {
    if (!message.trim()) { toast.error("Type a message first"); return; }
    if (audience === "class" && !classId) { toast.error("Pick a class"); return; }
    setSending(true);
    setManualRecipients(null);
    try {
      const res = await fetch("/api/messaging/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience, class_id: classId, message }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to send"); return; }

      if (data.mode === "manual") {
        setManualRecipients(data.recipients ?? []);
        toast.info("SMS not set up — send via WhatsApp below, or add an Arkesel key in Settings.");
      } else {
        toast.success(`Sent to ${data.sent} recipient${data.sent === 1 ? "" : "s"}${data.failed ? ` (${data.failed} failed)` : ""}`);
        setMessage("");
        void load();
      }
    } catch { toast.error("Network error"); }
    finally { setSending(false); }
  };

  const sendAllWhatsApp = () => {
    if (!manualRecipients) return;
    // Open the first one; in WhatsApp fallback mode each is opened individually.
    manualRecipients.forEach((r, i) => {
      setTimeout(() => {
        window.open(`https://wa.me/${toIntlPhone(r.phone)}?text=${encodeURIComponent(message)}`, "_blank");
      }, i * 400);
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Messaging</h1>
        <p className="text-sm text-gray-500 mt-1">Send SMS or WhatsApp messages to parents.</p>
      </div>

      {/* SMS status banner */}
      {smsConfigured === false && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 text-sm text-amber-900">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">SMS not set up</p>
            <p className="text-xs mt-0.5">Add your Arkesel API key and Sender ID in <strong>Settings → Messaging</strong> to send SMS (billed to your own Arkesel account). Until then, you can send via WhatsApp for free.</p>
          </div>
        </div>
      )}
      {smsConfigured && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3 text-sm text-green-900">
          <Wallet className="h-5 w-5 flex-shrink-0" />
          <p>SMS is active via Arkesel. {balance && <>Balance: <strong>{balance}</strong></>}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Composer */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Compose Message</CardTitle>
              <CardDescription>Choose who receives it and what to say.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Recipients</Label>
                  <Select value={audience} onValueChange={setAudience}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All parents</SelectItem>
                      <SelectItem value="class">A class</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {audience === "class" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Class</Label>
                    <Select value={classId} onValueChange={setClassId}>
                      <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Template</Label>
                <Select value={template} onValueChange={(v) => {
                  setTemplate(v);
                  const t = TEMPLATES[Number(v)];
                  if (t && t.text) setMessage(t.text);
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEMPLATES.map((t, i) => (<SelectItem key={i} value={String(i)}>{t.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Message</Label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  maxLength={640}
                  placeholder="Type your message to parents…"
                  className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{message.length}/640 characters</span>
                  <span>{Math.max(1, Math.ceil(message.length / 160))} SMS page(s) per recipient</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSend} disabled={sending} className="text-white" style={{ background: "hsl(150 80% 24%)" }}>
                  {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                  {smsConfigured ? "Send SMS" : "Prepare Message"}
                </Button>
              </div>

              {/* WhatsApp fallback list */}
              {manualRecipients && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-green-900">{manualRecipients.length} recipient(s) ready</p>
                    <Button size="sm" onClick={sendAllWhatsApp} className="bg-green-600 hover:bg-green-700 text-white">
                      <MessageCircle className="h-3.5 w-3.5 mr-1" /> Open all in WhatsApp
                    </Button>
                  </div>
                  <p className="text-xs text-green-700">Each parent opens in WhatsApp with the message ready — just tap send. (Free; sends from your WhatsApp.)</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* History */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Recent Messages</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No messages sent yet.</p>
              ) : (
                <div className="space-y-3">
                  {history.map((h) => (
                    <div key={h.id} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant={h.status === "sent" ? "success" : h.status === "partial" ? "warning" : "danger"} className="text-xs">
                          {h.status === "sent" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : null}
                          {h.sent_count} sent{h.failed_count ? `, ${h.failed_count} failed` : ""}
                        </Badge>
                        <span className="text-xs text-gray-400">{formatDate(h.sent_at)}</span>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">{h.message_text}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
