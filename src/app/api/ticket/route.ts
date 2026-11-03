import { NextRequest } from "next/server";
import { callSheet } from "@/features/rsvp/api/sheet.server";
import {
  guestNotFound,
  ticketFailure,
} from "@/features/rsvp/api/ticket.server";
import {
  displayName,
  TicketLookupSchema,
  type TicketResult,
} from "@/features/rsvp/contracts/rsvp.contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type SheetReply =
  | {
      ok: true;
      state: TicketResult["state"];
      receiptSent?: boolean;
      ticket: { name: string; plusOnes: number; heads: number };
    }
  | { ok: false; code: string };

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

  const doing = "load your ticket";
  try {
    const reply = await callSheet<SheetReply>({
      action: "ticket",
      name: parsed.data.name,
      contact: parsed.data.contact,
    });

    if (!reply.ok) {
      if (reply.code === "not_found") return guestNotFound();
      return ticketFailure(new Error(`sheet rejected: ${reply.code}`), doing);
    }

    const t = reply.ticket;
    const name = displayName(t.name);
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
        : reply.state === "unpaid"
          ? { state: "unpaid", name, receiptSent: Boolean(reply.receiptSent) }
          : { state: "waitlisted", name };
    return Response.json(result);
  } catch (err) {
    return ticketFailure(err, doing);
  }
}
