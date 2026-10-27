import { EVENT } from "@/features/rsvp/data/event";
import { PhotoPanel } from "@/features/rsvp/components/PhotoPanel";
import { RsvpForm } from "@/features/rsvp/components/RsvpForm";
import { GuestList } from "@/features/rsvp/components/GuestList";

const DETAILS = [
  { label: "Venue", value: EVENT.venue },
  { label: "Night", value: EVENT.night.label },
  {
    label: "Entrance fee",
    value: `${EVENT.entranceFee} · you pay`,
    highlight: true,
  },
  { label: "Food & drinks", value: "Covered" },
  { label: "Curfew", value: EVENT.curfew },
  { label: "Cap", value: `${EVENT.capacity} pax, then closed` },
];

/** Hand-drawn stroke under the headline, echoing a brush mark. */
function BrushUnderline() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 300 24"
      preserveAspectRatio="none"
      className="absolute -bottom-2 left-0 h-3 w-full text-[var(--jp-accent)] md:-bottom-3 md:h-4"
    >
      <path
        d="M3 15 C 60 6, 140 4, 296 9 C 220 12, 150 14, 40 21 C 110 15, 200 14, 286 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RsvpPage() {
  return (
    <main className="jp-page flex min-h-dvh items-center justify-center px-4 py-6 md:p-10">
      <div className="jp-card grid w-full max-w-6xl gap-2 rounded-2xl p-2 md:grid-cols-[1.05fr_1fr] md:p-3">
        <PhotoPanel />

        {/*
          On desktop the square photo alone sets the card's height; the form
          is taken out of flow and scrolls inside its column, so there's no
          empty space under the picture.
        */}
        <div className="relative">
          <section className="jp-scroll flex flex-col px-3 py-8 sm:px-6 md:absolute md:inset-0 md:overflow-y-auto md:px-10 md:py-10 lg:px-14">
            <p className="font-[family-name:var(--font-lora)] text-lg text-[var(--jp-text)]">
              {EVENT.name}
            </p>

            <h1 className="mt-8 font-[family-name:var(--font-lora)] text-[2.6rem] leading-[1.05] tracking-tight text-[var(--jp-text)] md:mt-12 md:text-6xl">
              Save{" "}
              <span className="relative inline-block whitespace-nowrap">
                Your Spot.
                <BrushUnderline />
              </span>
            </h1>

            <p className="mt-6 max-w-md text-sm leading-relaxed text-[var(--jp-muted)]">
              One {EVENT.night.label} night at {EVENT.venue}. Food and drinks
              are on {EVENT.host};{" "}
              <span className="font-semibold text-[var(--jp-text)]">
                you pay your own entrance fee.
              </span>{" "}
              Bring up to {EVENT.maxPlusOnes} friends. Only {EVENT.capacity}{" "}
              pax, so sign up before it closes.
            </p>

            <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-[var(--jp-border)] py-5 sm:grid-cols-3">
              {DETAILS.map((d) =>
                "highlight" in d ? (
                  <div
                    key={d.label}
                    className="-mx-2 -my-1 rounded-md bg-[rgb(var(--jp-accent-rgb)/0.15)] px-2 py-1 ring-1 ring-[rgb(var(--jp-accent-rgb)/0.5)]"
                  >
                    <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--jp-accent-soft)]">
                      {d.label}
                    </dt>
                    <dd className="mt-0.5 text-sm font-semibold text-[var(--jp-text)]">
                      {d.value}
                    </dd>
                  </div>
                ) : (
                  <div key={d.label}>
                    <dt className="text-[0.68rem] uppercase tracking-[0.14em] text-[var(--jp-faint)]">
                      {d.label}
                    </dt>
                    <dd className="mt-0.5 text-sm text-[var(--jp-text)]">
                      {d.value}
                    </dd>
                  </div>
                ),
              )}
            </dl>

            <div className="mt-7">
              <RsvpForm />
            </div>

            <GuestList />

            <p className="mt-6 text-xs text-[var(--jp-faint)]">
              Questions? DM{" "}
              <a
                href={`https://instagram.com/${EVENT.hostInstagram}`}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--jp-muted)] underline underline-offset-4 hover:text-[var(--jp-text)]"
              >
                @{EVENT.hostInstagram}
              </a>{" "}
              on Instagram.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
