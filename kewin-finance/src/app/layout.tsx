import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DataProvider } from "@/components/providers";
import { MobileHeader, MobileNav, Sidebar } from "@/components/nav";

export const metadata: Metadata = {
  title: "KEWIN FINANCE",
  description: "Persönlicher Finanz-Tracker von Kewin Ngatcheu",
  appleWebApp: { capable: true, title: "KEWIN FINANCE", statusBarStyle: "black-translucent" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0e0e0d" },
    { media: "(prefers-color-scheme: light)", color: "#f5f5f2" },
  ],
};

// Theme vor dem ersten Paint setzen (Einstellung: Dark / Light / System)
const themeScript = `try{var p=localStorage.getItem("kf-theme")||"system";var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){document.documentElement.dataset.theme="dark"}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans">
        <DataProvider>
          <div className="flex min-h-dvh">
            <Sidebar />
            <main className="min-w-0 flex-1 px-4 pb-36 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
              <div className="mx-auto max-w-5xl">
                <MobileHeader />
                {children}
              </div>
            </main>
          </div>
          <MobileNav />
        </DataProvider>
      </body>
    </html>
  );
}
