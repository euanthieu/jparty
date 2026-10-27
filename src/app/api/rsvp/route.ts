import { NextRequest } from "next/server";
import { EVENT } from "@/features/rsvp/data/event";
import {
  displayName,
  NIGHT_IDS,
  RsvpSchema,
  type NightId,
  type RsvpResult,
  type RsvpStatus,
} from "@/features/rsvp/contracts/rsvp.contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Apps Script is slow from Vercel (2-4s, much more on a cold start). */
export const maxDuration = 30;
const SHEET_TIMEOUT_MS = 20_000;

/**
 * Every open page polls the counter, and Apps Script has a daily execution
 * quota, so serve the status from memory for a short while.
 */
const STATUS_CACHE_MS = 15_000;
let cachedStatus: { at: number; status: RsvpStatus } | null = null;

const IG = `@${EVENT.hostInstagram}`;

/** The sheet sends full names; the page only ever sees display names. */
interface SheetStatus extends Omit<RsvpStatus, "guests"> {
  guests?: { name: string; plusOnes: number; night: string; status: string }[];
}

type SheetReply =
  | {
      ok: true;
      status: SheetStatus;
      outcome?: RsvpResult["outcome"];
      heads?: number;
    }
  | { ok: false; code: string };

function toPublicStatus(status: SheetStatus): RsvpStatus {
  return {
    ...status,
    // An Apps Script deployment predating the guest list sends none.
    guests: (status.guests ?? []).map((g) => ({
      name: displayName(g.name),
      plusOnes: Number(g.plusOnes) || 0,
      night: (NIGHT_IDS as readonly string[]).includes(g.night)
        ? (g.night as NightId)
        : null,
      waitlisted: g.status.toLowerCase() !== "confirmed",
    })),
  };
}

class SheetNotConfiguredError extends Error {}

/**
 * The guest list, the 40-head cap and duplicate checks all live in the
 * Apps Script bound to the RSVP sheet (docs/apps-script/Code.gs), which runs
 * them under a lock. This route only validates and forwards.
 */
async function callSheet(
  payload: Record<string, unknown>,
): Promise<SheetReply> {
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
    return JSON.parse(text) as SheetReply;
  } catch {
    // A wrong or retired /exec URL answers with an HTML error page.
    throw new Error(`sheet replied HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
}

function errorResponse(err: unknown): Response {
  if (err instanceof SheetNotConfiguredError) {
    console.error(
      "[rsvp] GOOGLE_SHEETS_WEBAPP_URL/SECRET not set — set both in this deployment's environment, then redeploy",
    );
    return Response.json(
      {
        error: `RSVPs aren't open yet. DM ${IG} on Instagram to get on the list.`,
        code: "storage_not_configured",
      },
      { status: 503 },
    );
  }
  const timedOut = err instanceof Error && err.name === "TimeoutError";
  console.error("[rsvp] sheet request failed", err);
  return Response.json(
    {
      error: timedOut
        ? "The guest list is taking too long to respond. Please try again."
        : "Couldn't save your RSVP right now. Please try again in a moment.",
      code: timedOut ? "timeout" : "storage_failed",
    },
    { status: timedOut ? 504 : 500 },
  );
}

/** Apps Script can only answer 200, so failures arrive as {ok:false}. */
function rejected(code: string): Response {
  console.error(`[rsvp] sheet rejected the request: ${code}`);
  return errorResponse(new Error(`sheet rejected: ${code}`));
}

export async function GET() {
  if (cachedStatus && Date.now() - cachedStatus.at < STATUS_CACHE_MS) {
    return Response.json(cachedStatus.status);
  }
  try {
    const reply = await callSheet({ action: "status" });
    if (!reply.ok) return rejected(reply.code);
    const status = toPublicStatus(reply.status);
    cachedStatus = { at: Date.now(), status };
    return Response.json(status);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = RsvpSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid RSVP." },
      { status: 400 },
    );
  }

  const rsvp = parsed.data;
  try {
    const reply = await callSheet({
      action: "rsvp",
      id: crypto.randomUUID(),
      name: rsvp.name,
      contact: rsvp.contact,
      night: rsvp.night,
      plusOnes: rsvp.plusOnes,
    });

    if (!reply.ok) {
      if (reply.code === "duplicate") {
        return Response.json(
          {
            error: `${rsvp.name} is already on the list. DM ${IG} on Instagram if you need to change your RSVP.`,
            code: "duplicate",
          },
          { status: 409 },
        );
      }
      return rejected(reply.code);
    }

    const status = toPublicStatus(reply.status);
    cachedStatus = { at: Date.now(), status };
    const result: RsvpResult = {
      outcome: reply.outcome ?? "confirmed",
      heads: reply.heads ?? 1 + rsvp.plusOnes,
      status,
    };
    return Response.json(result, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
