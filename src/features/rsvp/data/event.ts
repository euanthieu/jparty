/**
 * Everything guests read about the night lives here, so details that are
 * still undecided (fee, curfew) change in one place.
 */
export const EVENT = {
  name: "JParty",
  host: "Justin",
  hostInstagram: "djstnn_",
  venue: "Karma",
  city: "Baguio",
  month: "January 2027",
  /** Both Fridays; Justin hasn't picked between them yet. */
  dateOptions: "Jan 8 or 15",
  venueInstagram: "karma_bydrunkenchef",
  /** Headcount, plus-ones included. RSVPs past this land on the waitlist. */
  capacity: 40,
  maxPlusOnes: 3,
  entranceFee: "TBA",
  curfew: "Pending",
  /** Booked: Friday. Guests still say which night they'd prefer, for Justin's info. */
  night: { id: "friday", label: "Friday" },
} as const;

export const PARTY_PHOTOS = [
  { src: "/party/dj-booth.webp", alt: "DJ booth under paper lanterns" },
  { src: "/party/dance-floor.webp", alt: "Crowd dancing under hanging ferns" },
  { src: "/party/crowd-bar.webp", alt: "Friends packed around the bar" },
] as const;
