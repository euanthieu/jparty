import type { Metadata } from "next";
import Link from "next/link";
import { Archivo, Space_Mono } from "next/font/google";
import { EVENT } from "@/features/rsvp/data/event";
import { TicketLookup } from "@/features/rsvp/components/TicketLookup";

/** The ticket's poster type: extra-wide Archivo with Space Mono details. */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});
const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Your ticket",
  description: `Send your ${EVENT.name} payment and open your ticket.`,
  robots: { index: false },
};

export default function TicketPage() {
  return (
    <main
      className={`${archivo.variable} ${spaceMono.variable} jp-page flex min-h-dvh items-start justify-center px-4 py-10 md:items-center`}
    >
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
          Paid your entrance fee? Upload your receipt here. Once it&apos;s
          checked, your ticket with your name shows up on this page. Show it at
          the door at {EVENT.venue}.
        </p>
        <div className="mt-7">
          <TicketLookup />
        </div>
      </div>
    </main>
  );
}
