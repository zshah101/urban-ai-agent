import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AURA — Automated Urban Risk Analytics",
  description: "AI-powered urban safety intelligence for the Phoenix metro area. Query real-time risk assessments by ZIP code, neighborhood, or district.",
  keywords: ["urban safety", "risk analytics", "Phoenix", "AI", "crime data", "neighborhood intelligence"],
  authors: [{ name: "AURA System" }],
  openGraph: {
    title: "AURA — Automated Urban Risk Analytics",
    description: "AI-powered urban safety intelligence for the Phoenix metro area.",
    type: "website",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
