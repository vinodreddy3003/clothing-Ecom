"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-[70vh] place-items-center px-4 text-center">
      <div>
        <h1 className="text-2xl font-bold">This page didn&apos;t load.</h1>
        <p className="mt-2 text-[15px] text-stone">Something went wrong on our side. Try again, or come back in a minute.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button size="pill" onClick={reset}>
            Try again
          </Button>
          <Button asChild size="pill" variant="outline">
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
