"use client";

import { useEffect, useState } from "react";
import { posthogStatus } from "../PostHogProvider";
import Link from "next/link";

export function AnalyticsStatus() {
  const [status, setStatus] = useState<"loading" | "active" | "failed" | "limited">(posthogStatus);

  useEffect(() => {
    // Poll for status changes initially or just rely on the exported variable
    const interval = setInterval(() => {
      if (posthogStatus !== status) {
        setStatus(posthogStatus);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [status]);

  if (status === "loading") return null;

  return (
    <div className="border border-border rounded-md p-6 bg-background">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Analytics Health
        </p>
        <div className={`w-2 h-2 rounded-full ${
          status === "active" ? "bg-green-500" :
          status === "failed" ? "bg-red-500" :
          status === "limited" ? "bg-yellow-500" : "bg-yellow-500"
        }`} />
      </div>

      {status === "active" ? (
        <p className="text-sm font-medium text-foreground">Healthy — Active & Tracking</p>
      ) : status === "limited" ? (
        <div>
          <p className="text-sm font-medium text-yellow-600 dark:text-yellow-500">Rate Limited</p>
          <p className="text-xs text-muted-foreground mt-1">
            PostHog free-tier limits reached. Events may be dropped.
          </p>
        </div>
      ) : (
        <div>
          <p className="text-sm font-medium text-destructive">Unhealthy — Connection Interrupted</p>
          <p className="text-xs text-muted-foreground mt-1">
            Missing API key or initialization failed. Check NEXT_PUBLIC_POSTHOG_KEY.
          </p>
        </div>
      )}
      
      <Link 
        href="https://us.posthog.com/project/settings" 
        target="_blank"
        className="mt-4 inline-block text-xs text-muted-foreground hover:text-foreground hover:underline"
      >
        Check Dashboard on PostHog →
      </Link>
    </div>
  );
}
