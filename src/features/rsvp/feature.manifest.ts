/**
 * FAOS v5 — Feature Manifest
 *
 * CI-ONLY: This file is never imported into the React tree.
 * It is a static declaration consumed by tools/validate-architecture.ts.
 */
export const featureManifest = {
  name: "rsvp",
  dependsOn: [] as const,
  exposes: ["RsvpPage", "RsvpSchema", "EVENT"] as const,
} as const;

export type RsvpManifest = typeof featureManifest;
