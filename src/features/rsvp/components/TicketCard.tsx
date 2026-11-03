import { EVENT } from "@/features/rsvp/data/event";
import type { Ticket } from "@/features/rsvp/contracts/rsvp.contract";

/** Film grain over the blurred blobs, like the Canva poster the ticket is based on. */
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

function Cross() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-[7cqw] w-[7cqw] text-white"
    >
      <path
        d="M3 3 21 21M21 3 3 21"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
      />
    </svg>
  );
}

function Rule() {
  return <div aria-hidden className="h-px w-[52%] bg-white/70" />;
}

/**
 * The 9:16 ticket guests screenshot and show at the door. Text is sized in
 * container units, so it keeps the poster's proportions at any width.
 */
export function TicketCard({ ticket }: { ticket: Ticket }) {
  const friends =
    ticket.plusOnes === 0
      ? "Just you"
      : `+${ticket.plusOnes} ${ticket.plusOnes === 1 ? "friend" : "friends"}`;
  const display = "font-[family-name:var(--font-archivo)] [font-stretch:125%]";
  const mono = "font-[family-name:var(--font-space-mono)] uppercase";

  return (
    <div
      className="relative mx-auto aspect-[9/16] w-full max-w-[360px] overflow-hidden rounded-lg bg-[#1c1c1c] text-white shadow-[0_20px_60px_rgba(0,0,0,0.6)] [container-type:inline-size]"
      role="img"
      aria-label={`${EVENT.name} ticket for ${ticket.name}, admits ${ticket.heads}, paid`}
    >
      {/* Soft light shapes, blurred like out-of-focus film. */}
      <div aria-hidden className="absolute inset-0 blur-[6cqw]">
        <div className="absolute -right-[20%] top-[6%] h-[36%] w-[80%] rounded-full bg-[#b8b8b8]" />
        <div className="absolute -left-[30%] top-[2%] h-[30%] w-[60%] rounded-full bg-[#8d8d8d]" />
        <div className="absolute -right-[25%] bottom-[-6%] h-[48%] w-[70%] rounded-[45%] bg-[#bdbdbd]" />
        <div className="absolute left-[-5%] top-[26%] h-[52%] w-[85%] rounded-full bg-[#0b0b0b]" />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 opacity-40 mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />

      <div className="relative flex h-full flex-col [text-shadow:0_1px_12px_rgba(0,0,0,0.45)] items-center justify-center gap-[5.5cqw] px-[8cqw] text-center">
        <Cross />
        <p className={`${mono} text-[4.4cqw] tracking-[0.04em]`}>
          {EVENT.venue} · {EVENT.city}
        </p>
        <Rule />

        <div className={`${display} leading-[0.86]`}>
          <p className="text-[14.5cqw] font-black tracking-[-0.02em]">JPARTY</p>
          <p
            className="-my-[4.5cqw] text-[14.5cqw] font-black tracking-[0.02em] text-transparent [-webkit-text-stroke:0.35cqw_white]"
            aria-hidden
          >
            {EVENT.night.label.toUpperCase()}
          </p>
          <p className="text-[13.5cqw] font-black tracking-[-0.02em]">
            ADMIT {ticket.heads}
          </p>
        </div>

        <Rule />
        <div className={`${mono} space-y-[1.6cqw]`}>
          <p className="break-words text-[5.4cqw] font-bold leading-tight">
            {ticket.name}
          </p>
          <p className="text-[3.8cqw] tracking-[0.04em] text-white/85">
            {friends} · Paid
          </p>
          <p className="text-[3.8cqw] tracking-[0.04em] text-white/85">
            {EVENT.dateOptions} · {EVENT.month.split(" ").at(-1)}
          </p>
        </div>
        <Cross />
      </div>
    </div>
  );
}
