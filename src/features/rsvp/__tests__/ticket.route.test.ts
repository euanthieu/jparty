import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";
import { normalizeName } from "@/features/rsvp/contracts/rsvp.contract";

// ── Stand-in for the Apps Script "ticket" action (docs/apps-script/Code.gs) ──
interface Row {
  name: string;
  contact: string;
  plusOnes: number;
  heads: number;
  status: "Confirmed" | "Waitlist";
  paid: boolean;
}
let rows: Row[] = [];

const normalizeContact = (c = "") =>
  c
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[\s()-]/g, "");

function fakeSheet(_url: string, init: RequestInit) {
  const body = JSON.parse(String(init.body));
  const guest =
    rows.find((r) => normalizeName(r.name) === normalizeName(body.name)) ??
    rows.find(
      (r) => normalizeContact(r.contact) === normalizeContact(body.contact),
    );
  let reply: unknown;
  if (
    !guest ||
    normalizeContact(guest.contact) !== normalizeContact(body.contact)
  ) {
    reply = { ok: false, code: "not_found" };
  } else {
    reply = {
      ok: true,
      state:
        guest.status !== "Confirmed"
          ? "waitlisted"
          : guest.paid
            ? "ready"
            : "unpaid",
      ticket: {
        name: guest.name,
        plusOnes: guest.plusOnes,
        heads: guest.heads,
        night: "saturday",
      },
    };
  }
  return Promise.resolve(new Response(JSON.stringify(reply)));
}

async function lookup(name: string, contact: string) {
  vi.resetModules();
  const { POST } = await import("@/app/api/ticket/route");
  const req = new Request("http://localhost/api/ticket", {
    method: "POST",
    body: JSON.stringify({ name, contact }),
  });
  return POST(req as unknown as NextRequest);
}

describe("POST /api/ticket", () => {
  beforeEach(() => {
    rows = [
      {
        name: "Trisha Ricci Vidal",
        contact: "@trsharicci",
        plusOnes: 3,
        heads: 4,
        status: "Confirmed",
        paid: true,
      },
      {
        name: "Chloe Navalta",
        contact: "@chloenavalta",
        plusOnes: 1,
        heads: 2,
        status: "Confirmed",
        paid: false,
      },
      {
        name: "Late Guest",
        contact: "@late",
        plusOnes: 0,
        heads: 1,
        status: "Waitlist",
        paid: true,
      },
    ];
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

  it("shows a paid guest's ticket with their full name and headcount", async () => {
    const res = await lookup("trisha ricci vidal", "trsharicci");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      state: "ready",
      ticket: { name: "Trisha Ricci Vidal", plusOnes: 3, heads: 4 },
    });
  });

  it("finds the ticket by contact when the name is typed differently", async () => {
    const body = await (await lookup("Trisha Vidal", "@trsharicci")).json();
    expect(body.state).toBe("ready");
  });

  it("holds the ticket back until the fee is marked paid", async () => {
    const body = await (await lookup("Chloe Navalta", "@chloenavalta")).json();
    expect(body).toEqual({ state: "unpaid", name: "Chloe N." });
  });

  it("gives waitlisted guests no ticket, even if paid", async () => {
    const body = await (await lookup("Late Guest", "@late")).json();
    expect(body.state).toBe("waitlisted");
    expect(body.ticket).toBeUndefined();
  });

  it("won't open someone's ticket with only their name", async () => {
    const res = await lookup("Trisha Ricci Vidal", "@someoneelse");
    expect(res.status).toBe(404);
    expect(JSON.stringify(await res.json())).not.toContain("Trisha");
  });

  it("asks for both fields before calling the sheet", async () => {
    expect((await lookup("Trisha", "")).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends the shared secret and the ticket action", async () => {
    await lookup("Chloe Navalta", "@chloenavalta");
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(init.body))).toMatchObject({
      secret: "test-secret",
      action: "ticket",
    });
  });
});
