/**
 * JParty — RSVP intake.
 *
 * Bound to the JParty RSVP spreadsheet. The website's /api/rsvp route POSTs
 * here; this script owns the guest list, the 40-head cap and the waitlist.
 * Everything runs under a script lock so two guests submitting at the same
 * moment can't both take the last spot.
 *
 * Setup:
 *   1. Create a Google Sheet, then Extensions > Apps Script, paste this file.
 *   2. Set SHARED_SECRET below to a long random string, and use the same value
 *      for GOOGLE_SHEETS_SHARED_SECRET in Vercel.
 *   3. Deploy > New deployment > Web app > Execute as: Me,
 *      Who has access: Anyone. Copy the /exec URL into GOOGLE_SHEETS_WEBAPP_URL.
 *
 * Editing the sheet by hand is fine: counts are re-read on every request, so
 * changing a row's Status to "Confirmed" or "Waitlist" (or deleting a row)
 * updates the spots left on the site. Clearing a guest's Night lets them vote
 * once more by signing up again with the same name and contact.
 *
 * After pasting a new version: Deploy > Manage deployments > edit (pencil) >
 * Version: New version > Deploy. That keeps the same /exec URL.
 */
const SHARED_SECRET = "CHANGE_ME";
const SHEET_NAME = "RSVPs";
const HEADERS = [
  "Submitted",
  "Name",
  "Contact",
  "Night",
  "Plus-ones",
  "Heads",
  "Status",
  "ID",
];
const COL = { name: 1, contact: 2, night: 3, plusOnes: 4, heads: 5, status: 6 };
const NIGHTS = ["friday", "saturday"];

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, code: "bad_request" });
  }
  if (body.secret !== SHARED_SECRET) {
    return json({ ok: false, code: "unauthorized" });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getSheet();
    const rows = readRows(sheet);
    const capacity = Number(body.capacity) || 40;

    if (body.action === "status") {
      return json({ ok: true, status: summarize(rows, capacity) });
    }

    if (body.action === "rsvp") {
      const existing = findGuest(sheet, body.name, body.contact);
      if (existing) {
        // Guests restored after the vote reset have a blank Night. If they
        // sign up again with the same contact, record their vote on their
        // existing row: same spot, same heads, one vote each.
        const canVote =
          String(existing.values[COL.night]).trim() === "" &&
          normalizeContact(existing.values[COL.contact]) ===
            normalizeContact(body.contact);
        if (!canVote) return json({ ok: false, code: "duplicate" });

        sheet.getRange(existing.row, COL.night + 1).setValue(body.night);
        return json({
          ok: true,
          outcome: "voted",
          heads: Number(existing.values[COL.heads]) || 1,
          status: summarize(readRows(sheet), capacity),
        });
      }

      const heads = 1 + Number(body.plusOnes || 0);
      const before = summarize(rows, capacity);
      const confirmed = before.going + heads <= capacity;
      const row = [
        new Date(),
        body.name,
        body.contact,
        body.night,
        Number(body.plusOnes || 0),
        heads,
        confirmed ? "Confirmed" : "Waitlist",
        body.id,
      ];
      sheet.appendRow(row);
      rows.push(row);

      return json({
        ok: true,
        outcome: confirmed ? "confirmed" : "waitlisted",
        heads: heads,
        status: summarize(rows, capacity),
      });
    }

    return json({ ok: false, code: "bad_request" });
  } finally {
    lock.releaseLock();
  }
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  }
  return sheet;
}

function readRows(sheet) {
  const last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet
    .getRange(2, 1, last - 1, HEADERS.length)
    .getValues()
    .filter((r) => String(r[COL.name]).trim() !== "");
}

/**
 * Votes count every guest, waitlisted ones included. The guest list carries
 * names only — contacts never leave the sheet.
 */
function summarize(rows, capacity) {
  let going = 0;
  const votes = {};
  const guests = [];
  NIGHTS.forEach((n) => (votes[n] = 0));
  rows.forEach((r) => {
    guests.push({
      name: String(r[COL.name]),
      plusOnes: Number(r[COL.plusOnes]) || 0,
      night: String(r[COL.night]).toLowerCase(),
      status: String(r[COL.status]),
    });
    if (String(r[COL.status]).toLowerCase() === "confirmed") {
      going += Number(r[COL.heads]) || 1;
    }
    const night = String(r[COL.night]).toLowerCase();
    if (night in votes) votes[night] += 1;
  });
  return {
    capacity: capacity,
    going: going,
    spotsLeft: Math.max(capacity - going, 0),
    isFull: going >= capacity,
    votes: votes,
    guests: guests,
  };
}

/**
 * The guest's row (1-based sheet row number) and its values, or null.
 * Matches the name first, then the contact, so "Trisha Vidal" with the same
 * IG is still the "Trisha Ricci Vidal" already on the list.
 */
function findGuest(sheet, name, contact) {
  const last = sheet.getLastRow();
  if (last < 2) return null;
  const values = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  const key = normalize(name);
  const byName = values.findIndex((r) => normalize(r[COL.name]) === key);
  const contactKey = normalizeContact(contact);
  const i =
    byName !== -1 || !contactKey
      ? byName
      : values.findIndex((r) => normalizeContact(r[COL.contact]) === contactKey);
  return i === -1 ? null : { row: i + 2, values: values[i] };
}

/** "@Juan.DC" and "juan.dc", or "0917 123 4567" and "09171234567", match. */
function normalizeContact(contact) {
  return String(contact || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[\s()-]/g, "");
}

function normalize(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
