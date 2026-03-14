"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
    const [isClient, setIsClient] = useState(false);
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        setIsClient(true);
        try {
            if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
                posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
                    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
                    capture_pageview: false, // Handle routing manually for Next App Router
                });
            }
        } catch (e) {
            console.warn("PostHog initialization failed or was rate-limited.", e);
        }
    }, []);

    useEffect(() => {
        try {
            if (pathname) {
                let url = window.origin + pathname;
                if (searchParams?.toString()) {
                    url = url + `?${searchParams.toString()}`;
                }
                posthog.capture("$pageview", { $current_url: url });
            }
        } catch (e) {
            // Gracefully swallow error to prevent UI crash
        }
    }, [pathname, searchParams]);

    if (!isClient) return <>{children}</>;

    return <PHProvider client={posthog}>{children}</PHProvider>;
}
