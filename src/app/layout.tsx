import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ONE — Your Personal Life Operating System", template: "%s · ONE" },
  description: "Remember everything. Understand your life. Get things done. ONE is your personal memory and AI assistant in one calm place.",
  applicationName: "ONE",
};

const TZ_SCRIPT = `try{var t=Intl.DateTimeFormat().resolvedOptions().timeZone;if(t&&document.cookie.indexOf("one_tz="+encodeURIComponent(t))<0){document.cookie="one_tz="+encodeURIComponent(t)+"; path=/; max-age=31536000; samesite=lax"}}catch(e){}`;

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        {/* Store the browser timezone early so server-rendered dates match local time (static, no user input). */}
        <script dangerouslySetInnerHTML={{ __html: TZ_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-white">{children}</body>
    </html>
  );
}
