import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";
import { normalizeName } from "@/features/rsvp/contracts/rsvp.contract";

// ── Stand-in for the Apps Script web app (docs/apps-script/Code.gs) ──────────
interface Row {
  name: string;
  contact?: string;
  plusOnes?: number;
  night: string;
  heads: number;
  status: "Confirmed" | "Waitlist";
}
let rows: Row[] = [];
let secretAccepted = true;

function normalizeContact(contact = "") {
  return contact
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[\s()-]/g, "");
}

function summarize(capacity: number) {
  const going = rows
    .filter((r) => r.status === "Confirmed")
    .reduce((sum, r) => sum + r.heads, 0);
  const votes = { thursday: 0, friday: 0 } as Record<string, number>;
  for (const r of rows) votes[r.night] += 1;
  return {
    capacity,
    going,
    spotsLeft: Math.max(capacity - going, 0),
    isFull: going >= capacity,
    votes,
    guests: rows.map((r) => ({
      name: r.name,
      plusOnes: r.plusOnes ?? r.heads - 1,
      night: r.night,
      status: r.status,
    })),
  };
}

function fakeSheet(_url: string, init: RequestInit) {
  const body = JSON.parse(String(init.body));
  let reply: unknown;
  if (!secretAccepted) {
    reply = { ok: false, code: "unauthorized" };
  } else if (body.action === "status") {
    reply = { ok: true, status: summarize(body.capacity) };
  } else if (
    rows.some((r) => normalizeName(r.name) === normalizeName(body.name))
  ) {
    const existing = rows.find(
      (r) => normalizeName(r.name) === normalizeName(body.name),
    )!;
    const canVote =
      existing.night === "" &&
      normalizeContact(existing.contact) === normalizeContact(body.contact);
    if (canVote) {
      existing.night = body.night;
      reply = {
        ok: true,
        outcome: "voted",
        heads: existing.heads,
        status: summarize(body.capacity),
      };
    } else {
      reply = { ok: false, code: "duplicate" };
    }
  } else {
    const heads = 1 + body.plusOnes;
    const confirmed = summarize(body.capacity).going + heads <= body.capacity;
    rows.push({
      name: body.name,
      contact: body.contact,
      plusOnes: body.plusOnes,
      night: body.night,
      heads,
      status: confirmed ? "Confirmed" : "Waitlist",
    });
    reply = {
      ok: true,
      outcome: confirmed ? "confirmed" : "waitlisted",
      heads,
      status: summarize(body.capacity),
    };
  }
  return Promise.resolve(new Response(JSON.stringify(reply)));
}

function seed(going: number) {
  rows.push({
    name: "Earlier guests",
    night: "saturday",
    heads: going,
    status: "Confirmed",
  });
}

async function loadRoute() {
  vi.resetModules();
  return import("@/app/api/rsvp/route");
}

async function rsvp(name: string, plusOnes = 0, night = "friday") {
  const { POST } = await loadRoute();
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
    rows = [];
    secretAccepted = true;
    vi.stubEnv(
      "GOOGLE_SHEETS_WEBAPP_URL",
      "https://script.google.com/macros/s/test/exec",
    );
    vi.stubEnv("GOOGLE_SHEETS_SHARED_SECRET", "test-secret");
    vi.stubGlobal("fetch", vi.fn(fakeSheet));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
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
    seed(38);
    const body = await (await rsvp("Ben", 2, "saturday")).json();
    expect(body.outcome).toBe("waitlisted");
    expect(body.status.going).toBe(38);
    expect(body.status.votes.saturday).toBe(2);
  });

  it("adds a restored guest's vote to their row without taking more spots", async () => {
    rows.push({
      name: "Bianca",
      contact: "@Guest",
      night: "",
      heads: 2,
      status: "Confirmed",
    });
    const res = await rsvp("bianca", 3, "saturday");
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.outcome).toBe("voted");
    expect(body.heads).toBe(2);
    expect(body.status.going).toBe(2);
    expect(body.status.votes.saturday).toBe(1);
    expect(rows).toHaveLength(1);
  });

  it("lets each restored guest vote only once", async () => {
    rows.push({
      name: "Bianca",
      contact: "@guest",
      night: "",
      heads: 2,
      status: "Confirmed",
    });
    await rsvp("Bianca", 1, "saturday");
    const again = await rsvp("Bianca", 1, "friday");
    expect(again.status).toBe(409);
    expect(rows[0].night).toBe("saturday");
  });

  it("won't take a vote under someone else's name", async () => {
    rows.push({
      name: "Bianca",
      contact: "@biaengca",
      night: "",
      heads: 2,
      status: "Confirmed",
    });
    const res = await rsvp("Bianca", 1, "saturday");
    expect(res.status).toBe(409);
    expect(rows[0].night).toBe("");
  });

  it("fills the last spot exactly, then closes", async () => {
    seed(39);
    expect((await (await rsvp("Cara")).json()).outcome).toBe("confirmed");
    const late = await (await rsvp("Dan")).json();
    expect(late.outcome).toBe("waitlisted");
    expect(late.status.isFull).toBe(true);
  });

  it("answers 409 when the sheet already has that name", async () => {
    await rsvp("Juan Dela Cruz");
    expect((await rsvp("  juan  dela CRUZ ")).status).toBe(409);
  });

  it("sends the shared secret and capacity to the sheet", async () => {
    await rsvp("Eve");
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(init.body))).toMatchObject({
      secret: "test-secret",
      capacity: 40,
      action: "rsvp",
    });
  });

  it("fails loudly when the sheet rejects the secret", async () => {
    secretAccepted = false;
    expect((await rsvp("Finn")).status).toBe(500);
  });

  it("answers 503 when the sheet isn't configured", async () => {
    vi.stubEnv("GOOGLE_SHEETS_WEBAPP_URL", "");
    const res = await rsvp("Gia");
    expect(res.status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects more than 3 plus-ones before calling the sheet", async () => {
    expect((await rsvp("Hal", 4)).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("lists guests by first name and last initial, without contacts", async () => {
    await rsvp("Juan Dela Cruz", 2, "saturday");
    seed(34); // 3 + 34 = 37 going, so Maria's 2 fit and Liza's 4 don't
    await rsvp("Maria Santos", 1);
    const body = await (await rsvp("Liza", 3)).json();
    const names = body.status.guests.map(
      (g: { name: string; plusOnes: number; waitlisted: boolean }) =>
        `${g.name}${g.plusOnes ? ` +${g.plusOnes}` : ""}${g.waitlisted ? " (waitlist)" : ""}`,
    );
    expect(names).toEqual([
      "Juan D. +2",
      "Earlier G. +33",
      "Maria S. +1",
      "Liza +3 (waitlist)",
    ]);
    expect(JSON.stringify(body)).not.toContain("@guest");
  });
});
