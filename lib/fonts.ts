import { Geist, Geist_Mono, Space_Mono } from "next/font/google";

export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  preload: true,
  display: "swap",
});

export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: true,
  display: "swap",
});

export const spaceMono = Space_Mono({
  variable: "--font-base",
  subsets: ["latin"],
  weight: ["400", "700"],
  preload: true,
  display: "swap",
});
