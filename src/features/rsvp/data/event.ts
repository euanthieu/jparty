/**
 * Everything guests read about the night lives here, so details that are
 * still undecided (fee, curfew, the winning night) change in one place.
 */
export const EVENT = {
  name: "JParty",
  host: "Justin",
  hostInstagram: "djstnn_",
  venue: "Karma",
  /** Headcount, plus-ones included. RSVPs past this land on the waitlist. */
  capacity: 40,
  maxPlusOnes: 3,
  entranceFee: "TBA",
  curfew: "Pending",
  nights: [
    { id: "thursday", label: "Thursday" },
    { id: "friday", label: "Friday" },
  ],
} as const;

export const PARTY_PHOTOS = [
  { src: "/party/dj-booth.jpg", alt: "DJ booth under paper lanterns" },
  { src: "/party/dance-floor.jpg", alt: "Crowd dancing under hanging ferns" },
  { src: "/party/crowd-bar.jpg", alt: "Friends packed around the bar" },
] as const;
