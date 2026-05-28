"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { School } from "lucide-react";

/**
 * Legacy single-school setup page. Registration now provisions the school,
 * academic year, and default terms automatically. Redirect to the dashboard.
 */
export default function SetupPage() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.replace("/dashboard"), 1500);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center">
          <School className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Setup is automatic</h1>
          <p className="text-gray-600 text-sm">
            Your school is set up when you register. Taking you to the dashboard…
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
