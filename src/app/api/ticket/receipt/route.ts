import { NextRequest } from "next/server";
import { callSheet } from "@/features/rsvp/api/sheet.server";
import {
  guestNotFound,
  ticketFailure,
} from "@/features/rsvp/api/ticket.server";
import { ReceiptUploadSchema } from "@/features/rsvp/contracts/rsvp.contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Saving to Drive adds a few seconds on top of the usual Apps Script lag. */
export const maxDuration = 30;

type SheetReply = { ok: true } | { ok: false; code: string };

/**
 * Saves a guest's payment screenshot to the receipts folder in Drive and
 * links it on their row. Whoever collects the fees checks it, then ticks Paid.
 */
export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = ReceiptUploadSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Upload an image file." },
      { status: 400 },
    );
  }

  const doing = "upload your receipt";
  try {
    const reply = await callSheet<SheetReply>({
      action: "receipt",
      ...parsed.data,
    });
    if (!reply.ok) {
      if (reply.code === "not_found") return guestNotFound();
      return ticketFailure(new Error(`sheet rejected: ${reply.code}`), doing);
    }
    return Response.json({ ok: true }, { status: 201 });
  } catch (err) {
    return ticketFailure(err, doing);
  }
}
