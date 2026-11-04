import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ONE — Your Life. Your Business.",
    short_name: "ONE",
    description: "Your Life. Your Business. One Intelligent System.",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#FFFFFF",
    theme_color: "#FFFFFF",
    categories: ["productivity", "business", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
