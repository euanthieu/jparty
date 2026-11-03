import type { Metadata } from "next";
import Link from "next/link";
import { EVENT } from "@/features/rsvp/data/event";
import { TicketLookup } from "@/features/rsvp/components/TicketLookup";

export const metadata: Metadata = {
  title: `Your ticket · ${EVENT.name}`,
  description: `Open your ${EVENT.name} ticket once your entrance fee is paid.`,
  robots: { index: false },
};

export default function TicketPage() {
  return (
    <main className="jp-page flex min-h-dvh items-start justify-center px-4 py-10 md:items-center">
      <div className="jp-card w-full max-w-md rounded-2xl px-5 py-8 sm:px-8">
        <Link
          href="/"
          className="text-xs text-[var(--jp-faint)] underline-offset-4 hover:text-[var(--jp-muted)] hover:underline"
        >
          ← Back to the invite
        </Link>
        <h1 className="mt-5 font-[family-name:var(--font-lora)] text-4xl leading-tight tracking-tight text-[var(--jp-text)]">
          Your ticket
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--jp-muted)]">
          Once your entrance fee is paid, your ticket with your name shows up
          here. Show it at the door at {EVENT.venue}.
        </p>
        <div className="mt-7">
          <TicketLookup />
        </div>
      </div>
    </main>
  );
}
