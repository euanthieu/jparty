import { describe, it, expect } from "vitest";
import {
  normalizeName,
  RsvpSchema,
} from "@/features/rsvp/contracts/rsvp.contract";

const valid = {
  name: "Juan Dela Cruz",
  contact: "@juan.dc",
  night: "thursday",
  plusOnes: 2,
  agreedToFee: true,
};

describe("RsvpSchema", () => {
  it("accepts a complete RSVP", () => {
    expect(RsvpSchema.safeParse(valid).success).toBe(true);
  });

  it("caps plus-ones at 3", () => {
    expect(RsvpSchema.safeParse({ ...valid, plusOnes: 3 }).success).toBe(true);
    expect(RsvpSchema.safeParse({ ...valid, plusOnes: 4 }).success).toBe(false);
  });

  it("only allows Thursday or Friday", () => {
    expect(RsvpSchema.safeParse({ ...valid, night: "saturday" }).success).toBe(
      false,
    );
  });

  it("requires agreeing to the entrance fee", () => {
    const result = RsvpSchema.safeParse({ ...valid, agreedToFee: false });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["agreedToFee"]);
  });
});

describe("normalizeName", () => {
  it("treats case and spacing differences as the same guest", () => {
    expect(normalizeName("  Juan   DELA cruz ")).toBe(
      normalizeName("juan dela cruz"),
    );
  });
});
