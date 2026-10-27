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
  agreedToFee: z.literal(true, { error: "Please confirm the entrance fee." }),
});

export type RsvpInput = z.infer<typeof RsvpSchema>;

export interface RsvpStatus {
  capacity: number;
  /** Confirmed heads, plus-ones included. */
  going: number;
  spotsLeft: number;
  isFull: boolean;
  votes: Record<NightId, number>;
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
