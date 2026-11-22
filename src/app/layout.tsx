import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SITE_URL, X_HANDLE } from "@/lib/site/social";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});
const display = localFont({
  src: [
    { path: "./fonts/SpaceGrotesk-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/SpaceGrotesk-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-display",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "ADApolis",
  description: "The civic engine for Cardano governance",
  openGraph: {
    siteName: "ADApolis",
    title: "ADApolis",
    description: "The civic engine for Cardano governance",
    url: SITE_URL,
    type: "website",
  },
  twitter: {
    card: "summary",
    site: X_HANDLE,
    creator: X_HANDLE,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${display.variable} antialiased flex flex-col min-h-screen bg-brand-navy`}
      >
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
