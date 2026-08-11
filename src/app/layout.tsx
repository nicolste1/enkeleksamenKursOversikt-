import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

// Inter carries the Notion-like feel (M4.5); mapped to --font-sans in @theme.
const interSans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Enkeleksamen arbeidsflyt",
  description: "Internt verktøy for kursproduksjon",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="no"
      className={`${interSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
