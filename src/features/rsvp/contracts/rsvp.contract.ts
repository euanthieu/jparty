import { z } from "zod";
import { EVENT } from "@/features/rsvp/data/event";

export const NIGHT_IDS = ["thursday", "friday"] as const;
export type NightId = (typeof NIGHT_IDS)[number];

/** Shared by the form and the API so both reject the same input. */
export const RsvpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your name.")
    .max(60, "Keep your name under 60 characters."),
  contact: z
    .string()
    .trim()
    .min(3, "Add your IG or mobile so we can reach you.")
    .max(60, "Keep this under 60 characters."),
  night: z.enum(NIGHT_IDS, { error: "Pick the night you prefer." }),
  plusOnes: z
    .number()
    .int()
    .min(0)
    .max(EVENT.maxPlusOnes, `You can bring up to ${EVENT.maxPlusOnes}.`),
  agreedToFee: z.literal(true, {
    error: "Please confirm you'll pay your entrance fee.",
  }),
});

export type RsvpInput = z.infer<typeof RsvpSchema>;

/** What the public page shows per guest — never their contact. */
export interface GuestEntry {
  name: string;
  plusOnes: number;
  night: NightId | null;
  waitlisted: boolean;
}

export interface RsvpStatus {
  capacity: number;
  /** Confirmed heads, plus-ones included. */
  going: number;
  spotsLeft: number;
  isFull: boolean;
  votes: Record<NightId, number>;
  guests: GuestEntry[];
}

export interface RsvpResult {
  outcome: "confirmed" | "waitlisted";
  heads: number;
  status: RsvpStatus;
}

/** Same person typed with different spacing or case is still the same RSVP. */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Words that start a compound surname, as in "Dela Cruz" or "De los Santos". */
const SURNAME_PARTICLES = new Set([
  "de",
  "del",
  "dela",
  "della",
  "delos",
  "los",
  "la",
  "san",
  "santa",
  "sta",
  "sto",
]);

/** "Juan Dela Cruz" → "Juan D." — enough for friends to spot each other. */
export function displayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "Guest";

  let surnameStart = parts.length - 1;
  while (
    surnameStart > 1 &&
    SURNAME_PARTICLES.has(parts[surnameStart - 1].toLowerCase())
  ) {
    surnameStart -= 1;
  }
  return `${parts[0]} ${parts[surnameStart][0].toUpperCase()}.`;
}
