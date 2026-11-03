import { EVENT } from "@/features/rsvp/data/event";

/** Apps Script is slow from Vercel (2-4s, much more on a cold start). */
const SHEET_TIMEOUT_MS = 20_000;

export class SheetNotConfiguredError extends Error {}

/**
 * The guest list, the 40-head cap, duplicate checks and tickets all live in
 * the Apps Script bound to the RSVP sheet (docs/apps-script/Code.gs), which
 * runs them under a lock. Routes only validate and forward.
 */
export async function callSheet<T>(
  payload: Record<string, unknown>,
): Promise<T> {
  const url = process.env.GOOGLE_SHEETS_WEBAPP_URL?.trim();
  const secret = process.env.GOOGLE_SHEETS_SHARED_SECRET?.trim();
  if (!url || !secret) throw new SheetNotConfiguredError();

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, secret, capacity: EVENT.capacity }),
    signal: AbortSignal.timeout(SHEET_TIMEOUT_MS),
    cache: "no-store",
  });
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    // A wrong or retired /exec URL answers with an HTML error page.
    throw new Error(`sheet replied HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
}
