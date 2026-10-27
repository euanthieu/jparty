import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── In-memory stand-in for the Upstash calls the route makes ─────────────────
const store = new Map<string, unknown>();
const hashes = new Map<string, Record<string, number>>();

const fakeRedis = {
  get: async (key: string) => store.get(key) ?? null,
  set: async (key: string, value: unknown, opts?: { nx?: boolean }) => {
    if (opts?.nx && store.has(key)) return null;
    store.set(key, value);
    return "OK";
  },
  rpush: async () => 1,
  hincrby: async (key: string, field: string, by: number) => {
    const hash = hashes.get(key) ?? {};
    hash[field] = (hash[field] ?? 0) + by;
    hashes.set(key, hash);
    return hash[field];
  },
  hgetall: async (key: string) => hashes.get(key) ?? null,
  // Mirrors RESERVE_SCRIPT: increment only if the party stays within capacity.
  eval: async (_script: string, keys: string[], args: string[]) => {
    const current = Number(store.get(keys[0]) ?? 0);
    const heads = Number(args[0]);
    if (current + heads <= Number(args[1])) {
      store.set(keys[0], current + heads);
      return current + heads;
    }
    return -1;
  },
};

vi.mock("@/shared/lib/upstash", () => ({
  getRedis: () => fakeRedis,
  UpstashNotConfiguredError: class extends Error {},
}));

const { POST } = await import("@/app/api/rsvp/route");

function rsvp(name: string, plusOnes = 0, night = "friday") {
  const req = new Request("http://localhost/api/rsvp", {
    method: "POST",
    body: JSON.stringify({
      name,
      contact: "@guest",
      night,
      plusOnes,
      agreedToFee: true,
    }),
  });
  return POST(req as unknown as NextRequest);
}

describe("POST /api/rsvp", () => {
  beforeEach(() => {
    store.clear();
    hashes.clear();
  });

  it("confirms a guest and counts their plus-ones", async () => {
    const res = await rsvp("Ana", 2);
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.outcome).toBe("confirmed");
    expect(body.status.going).toBe(3);
    expect(body.status.votes.friday).toBe(1);
  });

  it("waitlists a party that would push past 40, but still counts the vote", async () => {
    store.set("rsvp:heads", 38);
    const res = await rsvp("Ben", 2, "thursday");
    const body = await res.json();
    expect(body.outcome).toBe("waitlisted");
    expect(body.status.going).toBe(38);
    expect(body.status.votes.thursday).toBe(1);
  });

  it("fills the last spot exactly, then closes", async () => {
    store.set("rsvp:heads", 39);
    expect((await (await rsvp("Cara")).json()).outcome).toBe("confirmed");
    const late = await (await rsvp("Dan")).json();
    expect(late.outcome).toBe("waitlisted");
    expect(late.status.isFull).toBe(true);
  });

  it("rejects the same name twice", async () => {
    await rsvp("Juan Dela Cruz");
    const res = await rsvp("  juan  dela CRUZ ");
    expect(res.status).toBe(409);
  });

  it("rejects more than 3 plus-ones", async () => {
    expect((await rsvp("Eli", 4)).status).toBe(400);
  });
});
