/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from "next";
import "./globals.css";
import "lenis/dist/lenis.css";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/Navbar";
import SmoothScroll from "@/components/SmoothScroll";
import RoutePrewarmer from "@/components/RoutePrewarmer";

export const metadata: Metadata = {
  title: "XENOVA - Collegiate Esports Platform",
  description: "The ultimate battleground for college esports. Compete in tournaments, join teams, and rise to glory. 50K+ players, 200+ universities, $2M+ in prizes.",
  keywords: ["XENOVA", "Esports", "Gaming", "College", "University", "Tournaments", "VALORANT", "CS2", "League of Legends", "Competitive Gaming"],
  authors: [{ name: "XENOVA" }],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎮</text></svg>",
  },
  openGraph: {
    title: "XENOVA - Collegiate Esports Platform",
    description: "The ultimate battleground for college esports. Compete, dominate, rise.",
    url: "https://xenova.gg",
    siteName: "XENOVA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "XENOVA - Collegiate Esports Platform",
    description: "The ultimate battleground for college esports",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700&family=Bebas+Neue&family=Orbitron:wght@700&family=Russo+One&family=Rajdhani:wght@500;700&family=Exo+2:wght@400;700&family=Inter:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased bg-[#070B14] text-white">
        <RoutePrewarmer />
        <SmoothScroll>
          <Navbar />
          {children}
          <Toaster />
        </SmoothScroll>
      </body>
    </html>
  );
}
