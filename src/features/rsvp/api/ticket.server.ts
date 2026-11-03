import { EVENT } from "@/features/rsvp/data/event";
import { SheetNotConfiguredError } from "@/features/rsvp/api/sheet.server";

const IG = `@${EVENT.hostInstagram}`;

/** Ticket lookups and receipt uploads fail the same way. */
export function ticketFailure(err: unknown, doing: string): Response {
  const timedOut = err instanceof Error && err.name === "TimeoutError";
  if (err instanceof SheetNotConfiguredError) {
    console.error("[ticket] GOOGLE_SHEETS_WEBAPP_URL/SECRET not set");
  } else {
    console.error(`[ticket] ${doing} failed`, err);
  }
  return Response.json(
    {
      error: timedOut
        ? "The guest list is taking too long to respond. Please try again."
        : `Couldn't ${doing} right now. Try again in a moment, or DM ${IG} on Instagram.`,
    },
    { status: timedOut ? 504 : 500 },
  );
}

export function guestNotFound(): Response {
  return Response.json(
    {
      error: `We couldn't find an RSVP with that name and contact. Use the same IG or mobile you signed up with, or DM ${IG} on Instagram.`,
    },
    { status: 404 },
  );
}
