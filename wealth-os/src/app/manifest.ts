import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wealth OS",
    short_name: "Wealth OS",
    description: "Persönliches Finanz- und Vermögenssystem",
    start_url: "/",
    display: "standalone",
    background_color: "#0f0f0e",
    theme_color: "#0f0f0e",
    lang: "de",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
