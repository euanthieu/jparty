"use client";

import { useQuery } from "@tanstack/react-query";
import type { RsvpStatus } from "@/features/rsvp/contracts/rsvp.contract";

export const RSVP_STATUS_KEY = ["rsvp", "status"] as const;

async function fetchStatus(): Promise<RsvpStatus> {
  const res = await fetch("/api/rsvp", { cache: "no-store" });
  if (!res.ok) throw new Error("status unavailable");
  return res.json();
}

/** Counter, votes and guest list share one poll of the sheet. */
export function useRsvpStatus() {
  return useQuery({
    queryKey: RSVP_STATUS_KEY,
    queryFn: fetchStatus,
    refetchInterval: 60_000,
    retry: false,
    // Without storage the form still works; it just hides the counter.
    meta: { silent: true },
  });
}
