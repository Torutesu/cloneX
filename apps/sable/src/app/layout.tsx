import type { Metadata } from "next";
import { brand, brandCssVars } from "@/brand/config";
import "./globals.css";

export const metadata: Metadata = {
  title: brand.name,
  description: brand.tagline,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" style={brandCssVars() as React.CSSProperties}>
      <body>{children}</body>
    </html>
  );
}
