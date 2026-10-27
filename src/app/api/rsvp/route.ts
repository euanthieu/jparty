import { NextRequest } from "next/server";
import { EVENT } from "@/features/rsvp/data/event";
import {
  NIGHT_IDS,
  normalizeName,
  RsvpSchema,
  type RsvpResult,
  type RsvpStatus,
} from "@/features/rsvp/contracts/rsvp.contract";
import { getRedis, UpstashNotConfiguredError } from "@/shared/lib/upstash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEYS = {
  heads: "rsvp:heads",
  votes: "rsvp:votes",
  index: "rsvp:index",
  guest: (id: string) => `rsvp:guest:${id}`,
  name: (normalized: string) => `rsvp:name:${normalized}`,
};

/**
 * Check-and-increment in one step: two guests submitting at the same moment
 * must not both squeeze into the last spot. Returns the new headcount, or -1
 * when the party would go past capacity.
 */
const RESERVE_SCRIPT = `
local current = tonumber(redis.call("GET", KEYS[1]) or "0")
local heads = tonumber(ARGV[1])
if current + heads <= tonumber(ARGV[2]) then
  return redis.call("INCRBY", KEYS[1], heads)
end
return -1
`;

async function readStatus(): Promise<RsvpStatus> {
  const redis = getRedis();
  const [heads, votes] = await Promise.all([
    redis.get<number>(KEYS.heads),
    redis.hgetall<Record<string, number>>(KEYS.votes),
  ]);
  const going = Number(heads ?? 0);
  return {
    capacity: EVENT.capacity,
    going,
    spotsLeft: Math.max(EVENT.capacity - going, 0),
    isFull: going >= EVENT.capacity,
    votes: Object.fromEntries(
      NIGHT_IDS.map((id) => [id, Number(votes?.[id] ?? 0)]),
    ) as RsvpStatus["votes"],
  };
}

function storageError(err: unknown): Response {
  if (err instanceof UpstashNotConfiguredError) {
    console.error(
      `[rsvp] storage is unconfigured — set ${err.missing.join(" and ")} in this deployment's environment, then redeploy`,
    );
    return Response.json(
      {
        error: `RSVPs aren't open yet. DM @${EVENT.hostInstagram} on Instagram to get on the list.`,
        code: "storage_not_configured",
      },
      { status: 503 },
    );
  }
  console.error(
    "[rsvp] Upstash request failed",
    err instanceof Error ? `${err.name}: ${err.message}` : err,
  );
  return Response.json(
    {
      error: "Couldn't save your RSVP right now. Please try again in a moment.",
      code: "storage_failed",
    },
    { status: 500 },
  );
}

export async function GET() {
  try {
    return Response.json(await readStatus());
  } catch (err) {
    return storageError(err);
  }
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = RsvpSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid RSVP." },
      { status: 400 },
    );
  }

  const rsvp = parsed.data;
  const id = crypto.randomUUID();
  const heads = 1 + rsvp.plusOnes;

  try {
    const redis = getRedis();

    const claimed = await redis.set(KEYS.name(normalizeName(rsvp.name)), id, {
      nx: true,
    });
    if (claimed === null) {
      return Response.json(
        {
          error: `${rsvp.name} is already on the list. DM @${EVENT.hostInstagram} on Instagram if you need to change your RSVP.`,
          code: "duplicate",
        },
        { status: 409 },
      );
    }

    const reserved = await redis.eval<string[], number>(
      RESERVE_SCRIPT,
      [KEYS.heads],
      [String(heads), String(EVENT.capacity)],
    );
    const outcome = reserved === -1 ? "waitlisted" : "confirmed";

    // Everyone's vote counts, waitlisted guests included.
    await Promise.all([
      redis.set(KEYS.guest(id), {
        ...rsvp,
        id,
        heads,
        outcome,
        createdAt: new Date().toISOString(),
      }),
      redis.rpush(KEYS.index, id),
      redis.hincrby(KEYS.votes, rsvp.night, 1),
    ]);

    const result: RsvpResult = {
      outcome,
      heads,
      status: await readStatus(),
    };
    return Response.json(result, { status: 201 });
  } catch (err) {
    return storageError(err);
  }
}
