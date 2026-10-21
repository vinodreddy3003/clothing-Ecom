import type { Metadata, Viewport } from "next";
import { Urbanist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { getSettings } from "@/lib/settings";
import "./globals.css";

const urbanist = Urbanist({ variable: "--font-urbanist", subsets: ["latin"], display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: { default: s.storeName, template: `%s | ${s.storeName}` },
    description: s.tagline ?? `Shop clothing and accessories at ${s.storeName}.`,
    openGraph: { siteName: s.storeName, type: "website" },
  };
}

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={urbanist.variable}>
      <body>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
