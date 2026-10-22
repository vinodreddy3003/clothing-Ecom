import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-[70vh] place-items-center px-4 text-center">
      <div>
        <p className="text-[96px] leading-none font-extrabold tracking-[-0.05em] md:text-[160px]">404</p>
        <h1 className="mt-4 text-2xl font-bold">We couldn&apos;t find that page.</h1>
        <p className="mt-2 text-[15px] text-stone">It may have moved, or the product is no longer available.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="pill">
            <Link href="/shop">Shop all products</Link>
          </Button>
          <Button asChild size="pill" variant="outline">
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
