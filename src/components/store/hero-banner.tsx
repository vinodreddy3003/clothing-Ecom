"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Banner = { id: string; title: string; subtitle: string | null; ctaLabel: string | null; ctaHref: string | null; imageUrl: string };

/** Ink panel with rotating admin banners. Pauses on hover/focus; no auto-rotation with reduced motion. */
export function HeroBanner({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (banners.length < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length, paused]);

  if (!banners.length) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Offers"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className="relative overflow-hidden rounded-3xl bg-ink text-paper"
    >
      <div className="grid">
        {banners.map((b, i) => (
          <div
            key={b.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${banners.length}`}
            aria-hidden={i !== index}
            inert={i !== index}
            className={cn(
              "col-start-1 row-start-1 grid min-h-[200px] grid-cols-[1.1fr_1fr] transition-opacity duration-700 md:min-h-[320px] lg:min-h-[440px] lg:grid-cols-2",
              i === index ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            <div className="relative z-10 flex flex-col justify-center gap-3 p-5 md:gap-5 md:p-10 lg:p-16">
              <h2 className="text-2xl leading-[1.1] font-bold tracking-[-0.03em] text-balance md:text-5xl lg:text-[64px] lg:leading-[1]">
                {b.title}
              </h2>
              {b.subtitle && <p className="hidden max-w-md text-paper/70 md:block md:text-lg">{b.subtitle}</p>}
              {b.ctaLabel && b.ctaHref && (
                <Button asChild variant="lime" className="h-10 w-fit rounded-full px-5 md:h-12 md:px-7 md:text-[15px]">
                  <Link href={b.ctaHref}>{b.ctaLabel}</Link>
                </Button>
              )}
            </div>
            <div className="relative">
              <Image
                src={b.imageUrl}
                alt=""
                fill
                priority={i === 0}
                sizes="(min-width: 1024px) 640px, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-ink to-transparent" />
            </div>
          </div>
        ))}
      </div>
      {banners.length > 1 && (
        <div className="absolute bottom-3 left-5 z-20 flex gap-1.5 md:bottom-6 md:left-10 lg:left-16">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              aria-label={`Show offer ${i + 1}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className="grid h-6 place-items-center"
            >
              <span className={cn("block h-1.5 rounded-full transition-all", i === index ? "w-5 bg-lime" : "w-1.5 bg-paper/50")} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
