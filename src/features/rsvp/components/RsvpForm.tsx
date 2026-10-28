"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EVENT } from "@/features/rsvp/data/event";
import {
  RsvpSchema,
  type NightId,
  type RsvpInput,
  type RsvpResult,
} from "@/features/rsvp/contracts/rsvp.contract";
import {
  RSVP_STATUS_KEY,
  useRsvpStatus,
} from "@/features/rsvp/hooks/useRsvpStatus";

const IG_URL = `https://instagram.com/${EVENT.hostInstagram}`;

/** Friday is booked; this only tells Justin which night guests would have picked. */
const NIGHT_OPTIONS: { id: NightId; label: string; dates: string }[] = [
  { id: "friday", label: "Friday", dates: EVENT.dateOptions },
  { id: "saturday", label: "Saturday", dates: "Jan 9 or 16" },
];

type FieldErrors = Partial<Record<keyof RsvpInput, string>>;

async function submitRsvp(input: RsvpInput): Promise<RsvpResult> {
  const res = await fetch("/api/rsvp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error ?? "Something went wrong. Please try again.");
  }
  return body as RsvpResult;
}

const fieldClass =
  "w-full rounded-md border border-[var(--jp-border)] bg-[var(--jp-field)] px-3.5 py-3 text-base text-[var(--jp-text)] placeholder:text-[var(--jp-faint)] outline-none transition focus:border-[rgb(var(--jp-text-rgb)/0.6)] focus:ring-2 focus:ring-white/10 aria-[invalid=true]:border-[var(--jp-accent)]";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-xs text-[var(--jp-accent-soft)]">
      {message}
    </p>
  );
}

function IgLink() {
  return (
    <a
      href={IG_URL}
      target="_blank"
      rel="noreferrer"
      className="text-[var(--jp-text)] underline underline-offset-4 hover:text-white"
    >
      @{EVENT.hostInstagram}
    </a>
  );
}

export function RsvpForm() {
  const queryClient = useQueryClient();
  const { data: status } = useRsvpStatus();

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [plusOnes, setPlusOnes] = useState(0);
  const [night, setNight] = useState<NightId | null>(null);
  const [agreedToFee, setAgreedToFee] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const mutation = useMutation({
    mutationFn: submitRsvp,
    meta: { silent: true },
    onSuccess: (result) =>
      queryClient.setQueryData(RSVP_STATUS_KEY, result.status),
  });

  const heads = 1 + plusOnes;
  const wouldWaitlist = status ? heads > status.spotsLeft : false;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = RsvpSchema.safeParse({
      name,
      contact,
      night: night ?? undefined,
      plusOnes,
      agreedToFee,
    });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof RsvpInput;
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    mutation.mutate(parsed.data);
  }

  if (mutation.isSuccess) {
    const { outcome, heads: held } = mutation.data;
    const firstName = name.trim().split(/\s+/)[0];
    return (
      <div
        role="status"
        className="rounded-xl border border-[var(--jp-border)] bg-[rgb(var(--jp-field-rgb)/0.6)] p-6"
      >
        {outcome === "voted" ? (
          <>
            <p className="font-[family-name:var(--font-lora)] text-3xl text-[var(--jp-text)]">
              Vote counted, {firstName}.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--jp-muted)]">
              You were already on the list, so we added your vote for{" "}
              {NIGHT_OPTIONS.find((o) => o.id === night)?.label} to your
              existing RSVP. Your {held === 1 ? "spot" : `${held} spots`} stay
              the same.
            </p>
          </>
        ) : outcome === "confirmed" ? (
          <>
            <p className="font-[family-name:var(--font-lora)] text-3xl text-[var(--jp-text)]">
              You&rsquo;re in, {firstName}.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--jp-muted)]">
              {held === 1 ? "Your spot is" : `${held} spots are`} held for{" "}
              {EVENT.night.label} at {EVENT.venue}, {EVENT.city} (
              {EVENT.dateOptions}). The final date and curfew will be announced
              soon.
            </p>
          </>
        ) : (
          <>
            <p className="font-[family-name:var(--font-lora)] text-3xl text-[var(--jp-text)]">
              You&rsquo;re on the waitlist.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--jp-muted)]">
              The list hit {EVENT.capacity} pax. DM <IgLink /> on Instagram if a
              spot opens up.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {status && (
        <div>
          <div className="mb-2 flex items-baseline justify-between text-xs text-[var(--jp-muted)]">
            <span>
              <span className="text-[var(--jp-text)]">{status.going}</span> /{" "}
              {status.capacity} going
            </span>
            <span>
              {status.isFull
                ? "Waitlist only"
                : `${status.spotsLeft} ${status.spotsLeft === 1 ? "spot" : "spots"} left`}
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-[var(--jp-field)]">
            <div
              className="h-full rounded-full bg-[var(--jp-accent)] transition-[width] duration-700"
              style={{
                width: `${Math.min((status.going / status.capacity) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {status?.isFull ? (
        <p className="rounded-md border border-[rgb(var(--jp-accent-rgb)/0.4)] bg-[rgb(var(--jp-accent-rgb)/0.1)] px-3.5 py-3 text-xs leading-relaxed text-[var(--jp-text)]">
          <span className="font-semibold">
            Sign-ups are closed: we&rsquo;ve hit {EVENT.capacity} pax.
          </span>{" "}
          You can still join the waitlist, or DM <IgLink />.
        </p>
      ) : (
        <p className="text-xs leading-relaxed text-[var(--jp-muted)]">
          <span className="font-semibold text-[var(--jp-text)]">
            Sign-ups close once {EVENT.capacity} pax are in.
          </span>{" "}
          After that, new RSVPs go to the waitlist.
        </p>
      )}

      <div>
        <label
          htmlFor="rsvp-name"
          className="mb-1.5 block text-xs text-[var(--jp-muted)]"
        >
          Name
        </label>
        <input
          id="rsvp-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Justin Vallejo"
          autoComplete="name"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "rsvp-name-error" : undefined}
          className={fieldClass}
        />
        <FieldError id="rsvp-name-error" message={errors.name} />
      </div>

      <div>
        <label
          htmlFor="rsvp-contact"
          className="mb-1.5 block text-xs text-[var(--jp-muted)]"
        >
          Instagram or mobile
        </label>
        <input
          id="rsvp-contact"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder={`@${EVENT.hostInstagram}`}
          aria-invalid={Boolean(errors.contact)}
          aria-describedby={errors.contact ? "rsvp-contact-error" : undefined}
          className={fieldClass}
        />
        <FieldError id="rsvp-contact-error" message={errors.contact} />
      </div>

      <fieldset>
        <legend className="mb-1.5 text-xs text-[var(--jp-muted)]">
          Bringing friends? (max {EVENT.maxPlusOnes})
        </legend>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: EVENT.maxPlusOnes + 1 }, (_, count) => {
            const selected = plusOnes === count;
            return (
              <label
                key={count}
                className={`cursor-pointer rounded-md border py-2.5 text-center text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-white/30 ${
                  selected
                    ? "border-[var(--jp-text)] bg-[var(--jp-text)] text-[var(--jp-bg)]"
                    : "border-[var(--jp-border)] bg-[var(--jp-field)] text-[var(--jp-text)] hover:border-[rgb(var(--jp-text-rgb)/0.4)]"
                }`}
              >
                <input
                  type="radio"
                  name="plusOnes"
                  value={count}
                  checked={selected}
                  onChange={() => setPlusOnes(count)}
                  className="sr-only"
                />
                {count === 0 ? "Just me" : `+${count}`}
              </label>
            );
          })}
        </div>
        {wouldWaitlist && !status?.isFull && (
          <p className="mt-1.5 text-xs text-[var(--jp-accent-soft)]">
            Only {status?.spotsLeft}{" "}
            {status?.spotsLeft === 1 ? "spot" : "spots"} left, so this RSVP for{" "}
            {heads} will go to the waitlist.
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-xs text-[var(--jp-muted)]">
          {EVENT.night.label} is the plan, but which night would you have
          preferred?
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {NIGHT_OPTIONS.map((option) => {
            const selected = night === option.id;
            return (
              <label
                key={option.id}
                className={`cursor-pointer rounded-md border py-2.5 text-center text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-white/30 ${
                  selected
                    ? "border-[var(--jp-text)] bg-[var(--jp-text)] text-[var(--jp-bg)]"
                    : "border-[var(--jp-border)] bg-[var(--jp-field)] text-[var(--jp-text)] hover:border-[rgb(var(--jp-text-rgb)/0.4)]"
                }`}
              >
                <input
                  type="radio"
                  name="night"
                  value={option.id}
                  checked={selected}
                  onChange={() => setNight(option.id)}
                  className="sr-only"
                />
                {option.label}
                {status && (
                  <span className="ml-1.5 text-xs opacity-60">
                    {status.votes[option.id]}
                  </span>
                )}
                <span className="block text-xs opacity-60">{option.dates}</span>
              </label>
            );
          })}
        </div>
        <FieldError id="rsvp-night-error" message={errors.night} />
      </fieldset>

      <div>
        <label
          className={`flex cursor-pointer items-start gap-3 rounded-md border px-3.5 py-3.5 transition ${
            agreedToFee
              ? "border-[var(--jp-accent)] bg-[rgb(var(--jp-accent-rgb)/0.15)]"
              : "border-[rgb(var(--jp-accent-rgb)/0.6)] bg-[rgb(var(--jp-accent-rgb)/0.08)] hover:bg-[rgb(var(--jp-accent-rgb)/0.15)]"
          }`}
        >
          <input
            type="checkbox"
            checked={agreedToFee}
            onChange={(e) => setAgreedToFee(e.target.checked)}
            aria-invalid={Boolean(errors.agreedToFee)}
            aria-describedby={errors.agreedToFee ? "rsvp-fee-error" : undefined}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--jp-accent)]"
          />
          <span className="text-xs leading-relaxed text-[var(--jp-muted)]">
            <span className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--jp-accent-soft)]">
              Entrance fee &middot; paid by you
            </span>
            <span className="block text-sm font-semibold text-[var(--jp-text)]">
              I agree to pay my own entrance fee ({EVENT.entranceFee}).
            </span>
            {EVENT.host} only covers food and drinks.
          </span>
        </label>
        <FieldError id="rsvp-fee-error" message={errors.agreedToFee} />
      </div>

      {mutation.isError && (
        <p
          role="alert"
          className="rounded-md border border-[rgb(var(--jp-accent-rgb)/0.4)] bg-[rgb(var(--jp-accent-rgb)/0.1)] px-3.5 py-3 text-xs text-[var(--jp-text)]"
        >
          {mutation.error.message}
        </p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full rounded-md bg-white py-3.5 font-[family-name:var(--font-lora)] text-sm font-semibold text-black shadow-[0_0_24px_rgba(255,255,255,0.18)] transition hover:bg-white/90 disabled:cursor-wait disabled:opacity-70"
      >
        {mutation.isPending
          ? "Saving your spot…"
          : status?.isFull || wouldWaitlist
            ? "Join the Waitlist"
            : "Count Me In"}
      </button>
    </form>
  );
}
