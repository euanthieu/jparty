"use client";

import type {
  GuestEntry,
  NightId,
} from "@/features/rsvp/contracts/rsvp.contract";
import { useRsvpStatus } from "@/features/rsvp/hooks/useRsvpStatus";

/** The night each guest said they'd prefer. */
const NIGHT_SHORT: Record<NightId, string> = {
  thursday: "Thu",
  friday: "Fri",
};

function GuestChip({ guest }: { guest: GuestEntry }) {
  return (
    <li
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${
        guest.waitlisted
          ? "border-dashed border-[var(--jp-border)] text-[var(--jp-muted)]"
          : "border-[var(--jp-border)] bg-[var(--jp-field)] text-[var(--jp-text)]"
      }`}
    >
      <span>{guest.name}</span>
      {guest.night && (
        <span className="text-[0.65rem] uppercase tracking-wider text-[var(--jp-muted)]">
          {NIGHT_SHORT[guest.night]}
        </span>
      )}
      {guest.plusOnes > 0 && (
        <span className="rounded-full bg-white/10 px-1.5 py-px text-[0.65rem] font-semibold">
          +{guest.plusOnes}
        </span>
      )}
    </li>
  );
}

export function GuestList() {
  const { data: status } = useRsvpStatus();
  if (!status) return null;

  const confirmed = status.guests.filter((g) => !g.waitlisted);
  const waitlist = status.guests.filter((g) => g.waitlisted);

  return (
    <section
      aria-labelledby="guest-list-heading"
      className="mt-8 border-t border-[var(--jp-border)] pt-6"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2
          id="guest-list-heading"
          className="font-[family-name:var(--font-lora)] text-xl text-[var(--jp-text)]"
        >
          Who&rsquo;s coming
        </h2>
        <span className="text-xs text-[var(--jp-muted)]">
          {status.going} / {status.capacity} people
        </span>
      </div>

      {confirmed.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--jp-muted)]">
          No one yet. Be the first on the list.
        </p>
      ) : (
        <ul className="mt-4 flex flex-wrap gap-2">
          {confirmed.map((g, i) => (
            <GuestChip key={`${g.name}-${i}`} guest={g} />
          ))}
        </ul>
      )}

      {waitlist.length > 0 && (
        <>
          <h3 className="mt-6 text-[0.68rem] uppercase tracking-[0.14em] text-[var(--jp-faint)]">
            Waitlist ({waitlist.length})
          </h3>
          <ul className="mt-2.5 flex flex-wrap gap-2">
            {waitlist.map((g, i) => (
              <GuestChip key={`${g.name}-${i}`} guest={g} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
