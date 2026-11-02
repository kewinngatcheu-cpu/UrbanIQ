import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ONE — Your Personal Life Operating System", template: "%s · ONE" },
  description: "Remember everything. Understand your life. Get things done. ONE is your personal memory and AI assistant in one calm place.",
  applicationName: "ONE",
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-white">{children}</body>
    </html>
  );
}
