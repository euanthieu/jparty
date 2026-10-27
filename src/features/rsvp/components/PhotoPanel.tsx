"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { PARTY_PHOTOS } from "@/features/rsvp/data/event";

const ROTATE_MS = 5000;

export function PhotoPanel() {
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % PARTY_PHOTOS.length),
      ROTATE_MS,
    );
    return () => clearInterval(timer);
  }, [reduceMotion]);

  const photo = PARTY_PHOTOS[index];

  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-[var(--jp-field)] md:aspect-auto md:min-h-[640px]">
      <AnimatePresence initial={false}>
        <motion.div
          key={photo.src}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            priority={index === 0}
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </motion.div>
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 to-transparent" />

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        {PARTY_PHOTOS.map((p, i) => (
          <button
            key={p.src}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Show photo ${i + 1}: ${p.alt}`}
            aria-current={i === index}
            className={`h-1.5 rounded-full transition-all ${
              i === index
                ? "w-6 bg-white"
                : "w-1.5 bg-white/45 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
