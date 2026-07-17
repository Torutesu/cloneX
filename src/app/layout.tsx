import type { Metadata } from "next";
import { brandToCssVars, activeBrand } from "@/lib/design-tokens";
import "./globals.css";

export const metadata: Metadata = {
  title: activeBrand.name,
  description: "Self-driving AI CRM",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <style dangerouslySetInnerHTML={{ __html: `:root { ${brandToCssVars()} }` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
