import { NextRequest } from "next/server";
import { EVENT } from "@/features/rsvp/data/event";
import {
  callSheet,
  SheetNotConfiguredError,
} from "@/features/rsvp/api/sheet.server";
import {
  displayName,
  TicketLookupSchema,
  type TicketResult,
} from "@/features/rsvp/contracts/rsvp.contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const IG = `@${EVENT.hostInstagram}`;

type SheetReply =
  | {
      ok: true;
      state: TicketResult["state"];
      ticket: { name: string; plusOnes: number; heads: number };
    }
  | { ok: false; code: string };

function failed(err: unknown): Response {
  const timedOut = err instanceof Error && err.name === "TimeoutError";
  if (err instanceof SheetNotConfiguredError) {
    console.error("[ticket] GOOGLE_SHEETS_WEBAPP_URL/SECRET not set");
  } else {
    console.error("[ticket] sheet request failed", err);
  }
  return Response.json(
    {
      error: timedOut
        ? "The guest list is taking too long to respond. Please try again."
        : `Couldn't load your ticket right now. Try again in a moment, or DM ${IG} on Instagram.`,
    },
    { status: timedOut ? 504 : 500 },
  );
}

/** Looks up a guest's ticket by the name and contact they RSVP'd with. */
export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = TicketLookupSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "Enter your name and contact.",
      },
      { status: 400 },
    );
  }

  try {
    const reply = await callSheet<SheetReply>({
      action: "ticket",
      name: parsed.data.name,
      contact: parsed.data.contact,
    });

    if (!reply.ok) {
      if (reply.code === "not_found") {
        return Response.json(
          {
            error: `We couldn't find an RSVP with that name and contact. Use the same IG or mobile you signed up with, or DM ${IG} on Instagram.`,
          },
          { status: 404 },
        );
      }
      return failed(new Error(`sheet rejected: ${reply.code}`));
    }

    const t = reply.ticket;
    const result: TicketResult =
      reply.state === "ready"
        ? {
            state: "ready",
            ticket: {
              name: t.name,
              plusOnes: Number(t.plusOnes) || 0,
              heads: Number(t.heads) || 1,
            },
          }
        : { state: reply.state, name: displayName(t.name) };
    return Response.json(result);
  } catch (err) {
    return failed(err);
  }
}
