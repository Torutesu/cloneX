import type { Metadata } from "next";
import localFont from "next/font/local";
import { brandToCssVars, activeBrand } from "@/lib/design-tokens";
import "./globals.css";

// Self-hosted Inter (variable, latin subset, OFL) — no build-time network fetch.
// Renders latin text (stage names, amounts, emails) in Octolane's grotesk register;
// Japanese glyphs fall through to the system stack declared in the brand font token.
const inter = localFont({
  src: "./fonts/InterVariable-latin.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-inter",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
});

export const metadata: Metadata = {
  title: activeBrand.name,
  description: "Self-driving AI CRM",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={inter.variable}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: `:root { ${brandToCssVars()} }` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
