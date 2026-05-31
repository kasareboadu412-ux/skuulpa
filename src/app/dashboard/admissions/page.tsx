"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Link as LinkIcon,
  Copy,
  Check,
} from "lucide-react";

interface Application {
  id: string;
  child_first_name: string;
  child_last_name: string;
  dob: string | null;
  parent_first_name: string;
  parent_last_name: string;
  parent_phone: string;
  parent_email: string | null;
  status: "pending" | "accepted" | "rejected" | "waitlisted";
  created_at: string;
  applied_class?: { id: string; name: string } | null;
}

export default function AdmissionsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [shortCode, setShortCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/schools/me");
        if (res.ok) {
          const data = await res.json();
          if (data.data?.short_code) setShortCode(data.data.short_code);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const admissionUrl =
    typeof window !== "undefined" && shortCode
      ? `${window.location.origin}/admission?school=${encodeURIComponent(shortCode)}`
      : null;

  const handleCopy = async () => {
    if (!admissionUrl) return;
    try {
      await navigator.clipboard.writeText(admissionUrl);
      setCopied(true);
      toast.success("Admission link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Select and copy manually.");
    }
  };

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const url = statusFilter === "all" ? "/api/admissions" : `/api/admissions?status=${statusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) setApplications(data.data ?? []);
      else toast.error(data.error || "Failed to load applications");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { void loadApplications(); }, [loadApplications]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/admissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update");
        return;
      }
      if (data.parent_login?.pin) {
        toast.success(
          `Application accepted. Parent login → phone ${data.parent_login.phone}, PIN ${data.parent_login.pin}`,
          { duration: 12000 }
        );
      } else {
        toast.success(`Application ${status}`);
      }
      void loadApplications();
    } catch {
      toast.error("Network error");
    }
  };

  const filtered = applications.filter((a) =>
    `${a.child_first_name} ${a.child_last_name} ${a.parent_phone} ${a.parent_first_name} ${a.parent_last_name}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "warning" | "success" | "danger" | "secondary"> = {
      pending: "warning",
      accepted: "success",
      rejected: "danger",
      waitlisted: "secondary",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admissions</h1>
          <p className="text-gray-500 mt-1">Manage incoming student applications</p>
        </div>
      </div>

      {admissionUrl && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-blue-600" />
              Public admission link
            </CardTitle>
            <CardDescription>
              Share this link with parents — they can apply directly without an account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input value={admissionUrl} readOnly className="font-mono text-xs" />
              <Button variant="outline" onClick={handleCopy} className="gap-1">
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4 items-center flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input placeholder="Search applications..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {["all", "pending", "accepted", "waitlisted", "rejected"].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors capitalize ${
                statusFilter === f ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Applications ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Child Name</TableHead>
                <TableHead>Applied Class</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">No applications found</TableCell>
                </TableRow>
              ) : (
                filtered.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.child_first_name} {app.child_last_name}</TableCell>
                    <TableCell>{app.applied_class?.name ?? "—"}</TableCell>
                    <TableCell>{app.parent_first_name} {app.parent_last_name}</TableCell>
                    <TableCell>{app.parent_phone}</TableCell>
                    <TableCell>{formatDate(app.created_at)}</TableCell>
                    <TableCell>{getStatusBadge(app.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" className="text-green-600" onClick={() => updateStatus(app.id, "accepted")} disabled={app.status === "accepted"} title="Accept">
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-yellow-600" onClick={() => updateStatus(app.id, "waitlisted")} disabled={app.status === "waitlisted"} title="Waitlist">
                          <Clock className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => updateStatus(app.id, "rejected")} disabled={app.status === "rejected"} title="Reject">
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
