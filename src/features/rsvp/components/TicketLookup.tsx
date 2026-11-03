"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { EVENT } from "@/features/rsvp/data/event";
import { TicketCard } from "@/features/rsvp/components/TicketCard";
import {
  MAX_RECEIPT_CHARS,
  TicketLookupSchema,
  type ReceiptUpload as ReceiptUploadInput,
  type TicketLookup as TicketLookupInput,
  type TicketResult,
} from "@/features/rsvp/contracts/rsvp.contract";

const IG_URL = `https://instagram.com/${EVENT.hostInstagram}`;

const fieldClass =
  "w-full rounded-md border border-[var(--jp-border)] bg-[var(--jp-field)] px-3.5 py-3 text-base text-[var(--jp-text)] placeholder:text-[var(--jp-faint)] outline-none transition focus:border-[rgb(var(--jp-text-rgb)/0.6)] focus:ring-2 focus:ring-white/10";

const buttonClass =
  "w-full rounded-md bg-white py-3.5 font-[family-name:var(--font-lora)] text-sm font-semibold text-black shadow-[0_0_24px_rgba(255,255,255,0.18)] transition hover:bg-white/90 disabled:cursor-wait disabled:opacity-70";

/** Receipts stay readable at this size and upload quickly on mobile data. */
const RECEIPT_MAX_SIDE = 1600;

async function postJson<T>(url: string, input: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error ?? "Something went wrong. Please try again.");
  }
  return body as T;
}

/** Shrinks a phone screenshot to a JPEG data URL before it's uploaded. */
async function shrinkImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    RECEIPT_MAX_SIDE / Math.max(bitmap.width, bitmap.height),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't read that image. Try another one.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const url = canvas.toDataURL("image/jpeg", 0.82);
  if (url.length > MAX_RECEIPT_CHARS) {
    throw new Error("That image is too big. Try a smaller screenshot.");
  }
  return url;
}

function IgLink() {
  return (
    <a
      href={IG_URL}
      target="_blank"
      rel="noreferrer"
      className="underline underline-offset-4 hover:text-[var(--jp-text)]"
    >
      @{EVENT.hostInstagram}
    </a>
  );
}

function ReceiptUpload({
  guest,
  name,
  alreadySent,
}: {
  guest: TicketLookupInput;
  name: string;
  alreadySent: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (input: ReceiptUploadInput) =>
      postJson<{ ok: true }>("/api/ticket/receipt", input),
  });

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setReadError(null);
    mutation.reset();
    try {
      setPreview(await shrinkImage(file));
    } catch (err) {
      setPreview(null);
      setReadError(
        err instanceof Error && err.message.startsWith("That")
          ? err.message
          : "Couldn't read that image. Try a screenshot (JPG or PNG).",
      );
    }
  }

  const sent = mutation.isSuccess;
  const error = readError ?? mutation.error?.message;
  return (
    <div
      role="status"
      className="space-y-4 rounded-md border border-[var(--jp-border)] bg-[rgb(var(--jp-field-rgb)/0.6)] px-4 py-4 text-sm leading-relaxed text-[var(--jp-text)]"
    >
      {sent ? (
        <p>
          Got it, {name}. Your receipt is in. Once it&apos;s checked, your
          ticket shows up here. Come back with the same name and contact.
        </p>
      ) : alreadySent ? (
        <p>
          Hi {name}, we have your receipt and it&apos;s waiting to be checked.
          Your ticket shows up here once it is. Sent the wrong screenshot?
          Upload a new one below.
        </p>
      ) : (
        <p>
          Hi {name}, your spot is held. Upload a screenshot of your entrance fee
          payment, and your ticket shows up here once it&apos;s checked.
        </p>
      )}

      {!sent && (
        <>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-[rgb(var(--jp-text-rgb)/0.35)] px-4 py-5 text-center transition hover:border-[rgb(var(--jp-text-rgb)/0.6)] focus-within:ring-2 focus-within:ring-white/20">
            <span className="font-semibold">
              {preview ? "Choose a different screenshot" : "Choose screenshot"}
            </span>
            <span className="text-xs text-[var(--jp-muted)]">
              Your GCash or bank receipt, JPG or PNG
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={onPick}
              className="sr-only"
            />
          </label>
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element -- local data URL preview
            <img
              src={preview}
              alt="Your payment screenshot"
              className="mx-auto max-h-72 rounded border border-[var(--jp-border)]"
            />
          )}
          {error && (
            <p role="alert" className="text-xs text-[var(--jp-accent-soft)]">
              {error}
            </p>
          )}
          {preview && (
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate({ ...guest, image: preview })}
              className={buttonClass}
            >
              {mutation.isPending ? "Uploading…" : "Send receipt"}
            </button>
          )}
        </>
      )}
      <p className="text-xs text-[var(--jp-muted)]">
        Questions about your payment? DM <IgLink />.
      </p>
    </div>
  );
}

export function TicketLookup() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (input: TicketLookupInput) =>
      postJson<TicketResult>("/api/ticket", input),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = TicketLookupSchema.safeParse({ name, contact });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Check your details.");
      return;
    }
    setFormError(null);
    mutation.mutate(parsed.data);
  }

  const result = mutation.data;
  if (result?.state === "ready") {
    return (
      <div className="space-y-4">
        <TicketCard ticket={result.ticket} />
        <p className="text-center text-xs leading-relaxed text-[var(--jp-muted)]">
          Screenshot this and show it at the door. The staff will find your name
          on the paid list.
        </p>
      </div>
    );
  }

  if (result?.state === "unpaid" && mutation.variables) {
    return (
      <ReceiptUpload
        guest={mutation.variables}
        name={result.name}
        alreadySent={result.receiptSent}
      />
    );
  }

  const error = formError ?? mutation.error?.message;
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {result?.state === "waitlisted" && (
        <div
          role="status"
          className="rounded-md border border-[var(--jp-border)] bg-[rgb(var(--jp-field-rgb)/0.6)] px-4 py-3.5 text-sm leading-relaxed text-[var(--jp-text)]"
        >
          Hi {result.name}, you&apos;re on the waitlist, so there&apos;s no
          ticket yet and nothing to pay. We&apos;ll message you if a spot opens
          up.
        </div>
      )}
      <div>
        <label
          htmlFor="ticket-name"
          className="mb-1.5 block text-xs text-[var(--jp-muted)]"
        >
          Name you RSVP&apos;d with
        </label>
        <input
          id="ticket-name"
          className={fieldClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          placeholder="Justin Vallejo"
        />
      </div>
      <div>
        <label
          htmlFor="ticket-contact"
          className="mb-1.5 block text-xs text-[var(--jp-muted)]"
        >
          IG or mobile you RSVP&apos;d with
        </label>
        <input
          id="ticket-contact"
          className={fieldClass}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          autoComplete="off"
          placeholder={`@${EVENT.hostInstagram}`}
        />
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-md border border-[rgb(var(--jp-accent-rgb)/0.4)] bg-[rgb(var(--jp-accent-rgb)/0.1)] px-3.5 py-3 text-xs text-[var(--jp-text)]"
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={mutation.isPending}
        className={buttonClass}
      >
        {mutation.isPending ? "Checking…" : "Continue"}
      </button>
    </form>
  );
}
