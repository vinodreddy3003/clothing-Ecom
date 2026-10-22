import Image from "next/image";

export function AuthShell({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="grid items-stretch gap-10 pt-6 md:pt-10 lg:grid-cols-2">
      <div className="relative hidden overflow-hidden rounded-3xl bg-tile lg:block">
        <Image
          src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&q=80&auto=format&fit=crop"
          alt=""
          fill
          sizes="50vw"
          className="object-cover"
        />
      </div>
      <div className="mx-auto w-full max-w-[400px] py-4 lg:py-16">
        <h1 className="text-[26px] leading-8 font-bold tracking-[-0.02em] md:text-[40px] md:leading-[44px]">{title}</h1>
        <p className="mt-2 mb-8 text-[15px] text-stone">{body}</p>
        {children}
      </div>
    </div>
  );
}
