"use client";

import { Suspense } from "react";
import AdmissionForm from "./admission-form";

export default function AdmissionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      }
    >
      <AdmissionForm />
    </Suspense>
  );
}
