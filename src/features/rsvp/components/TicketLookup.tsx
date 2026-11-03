"use client";

import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { EVENT } from "@/features/rsvp/data/event";
import {
  TicketLookupSchema,
  type Ticket,
  type TicketLookup as TicketLookupInput,
  type TicketResult,
} from "@/features/rsvp/contracts/rsvp.contract";

const IG_URL = `https://instagram.com/${EVENT.hostInstagram}`;

const fieldClass =
  "w-full rounded-md border border-[var(--jp-border)] bg-[var(--jp-field)] px-3.5 py-3 text-base text-[var(--jp-text)] placeholder:text-[var(--jp-faint)] outline-none transition focus:border-[rgb(var(--jp-text-rgb)/0.6)] focus:ring-2 focus:ring-white/10";

async function fetchTicket(input: TicketLookupInput): Promise<TicketResult> {
  const res = await fetch("/api/ticket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error ?? "Something went wrong. Please try again.");
  }
  return body as TicketResult;
}

function IgLink() {
  return (
    <a
      href={IG_URL}
      target="_blank"
      rel="noreferrer"
      className="underline underline-offset-4 hover:text-[var(--jp-text)]"
    >
      @{EVENT.hostInstagram}
    </a>
  );
}

/** The thing guests show at the door; staff match the name to the paid list. */
function TicketCard({ ticket }: { ticket: Ticket }) {
  const friends =
    ticket.plusOnes === 0
      ? "Just you"
      : `You + ${ticket.plusOnes} ${ticket.plusOnes === 1 ? "friend" : "friends"}`;
  return (
    <div className="overflow-hidden rounded-xl border border-[rgb(var(--jp-accent-rgb)/0.55)] bg-[var(--jp-field)] shadow-[0_0_40px_rgba(201,37,27,0.18)]">
      <div className="flex items-center justify-between bg-[var(--jp-accent)] px-5 py-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white">
        <span>{EVENT.name} · Paid</span>
        <span>Admit {ticket.heads}</span>
      </div>
      <div className="px-5 pb-5 pt-6">
        <p className="text-[0.68rem] uppercase tracking-[0.14em] text-[var(--jp-faint)]">
          Guest
        </p>
        <p className="mt-1 break-words font-[family-name:var(--font-lora)] text-3xl leading-tight text-[var(--jp-text)]">
          {ticket.name}
        </p>
        <p className="mt-1 text-sm text-[var(--jp-muted)]">{friends}</p>
      </div>
      <div className="border-t border-dashed border-[var(--jp-border)] px-5 py-4">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-[0.68rem] uppercase tracking-[0.14em] text-[var(--jp-faint)]">
              When
            </dt>
            <dd className="mt-0.5 text-[var(--jp-text)]">
              {EVENT.night.label}, {EVENT.dateOptions}
            </dd>
          </div>
          <div>
            <dt className="text-[0.68rem] uppercase tracking-[0.14em] text-[var(--jp-faint)]">
              Where
            </dt>
            <dd className="mt-0.5 text-[var(--jp-text)]">
              {EVENT.venue}, {EVENT.city}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-[var(--jp-muted)]">
          Show this at the door. The staff will find your name on the paid list.{" "}
          {ticket.heads > 1 && "Come in together with your friends."}
        </p>
      </div>
    </div>
  );
}

export function TicketLookup() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const mutation = useMutation({ mutationFn: fetchTicket });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = TicketLookupSchema.safeParse({ name, contact });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Check your details.");
      return;
    }
    setFormError(null);
    mutation.mutate(parsed.data);
  }

  const result = mutation.data;
  if (result?.state === "ready") {
    return (
      <div className="space-y-4">
        <TicketCard ticket={result.ticket} />
        <p className="text-xs text-[var(--jp-faint)]">
          Take a screenshot so you have it even without signal.
        </p>
      </div>
    );
  }

  const error = formError ?? mutation.error?.message;
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {result && (
        <div
          role="status"
          className="rounded-md border border-[var(--jp-border)] bg-[rgb(var(--jp-field-rgb)/0.6)] px-4 py-3.5 text-sm leading-relaxed text-[var(--jp-text)]"
        >
          {result.state === "unpaid" ? (
            <>
              Hi {result.name}, your spot is held, but your entrance fee
              isn&apos;t marked as paid yet. Once your payment is confirmed,
              your ticket shows up here. Paid already? DM <IgLink />.
            </>
          ) : (
            <>
              Hi {result.name}, you&apos;re on the waitlist, so there&apos;s no
              ticket yet. We&apos;ll message you if a spot opens up.
            </>
          )}
        </div>
      )}
      <div>
        <label
          htmlFor="ticket-name"
          className="mb-1.5 block text-xs text-[var(--jp-muted)]"
        >
          Name you RSVP&apos;d with
        </label>
        <input
          id="ticket-name"
          className={fieldClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          placeholder="Justin Vallejo"
        />
      </div>
      <div>
        <label
          htmlFor="ticket-contact"
          className="mb-1.5 block text-xs text-[var(--jp-muted)]"
        >
          IG or mobile you RSVP&apos;d with
        </label>
        <input
          id="ticket-contact"
          className={fieldClass}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          autoComplete="off"
          placeholder={`@${EVENT.hostInstagram}`}
        />
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-md border border-[rgb(var(--jp-accent-rgb)/0.4)] bg-[rgb(var(--jp-accent-rgb)/0.1)] px-3.5 py-3 text-xs text-[var(--jp-text)]"
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full rounded-md bg-white py-3.5 font-[family-name:var(--font-lora)] text-sm font-semibold text-black shadow-[0_0_24px_rgba(255,255,255,0.18)] transition hover:bg-white/90 disabled:cursor-wait disabled:opacity-70"
      >
        {mutation.isPending ? "Finding your ticket…" : "Show my ticket"}
      </button>
    </form>
  );
}
