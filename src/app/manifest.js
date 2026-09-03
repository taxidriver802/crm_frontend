import { DEFAULT_PALETTE_ID, resolvePwaTheme } from "@/theme/registry";

export default function manifest() {
  const pwa = resolvePwaTheme(DEFAULT_PALETTE_ID);

  return {
    name: "Rooftop Realty CRM",
    short_name: "CRM",
    description: "Roofing, Gutters, Siding, Windows — Lead to Revenue",
    start_url: "/dashboard",
    display: "standalone",
    background_color: pwa.backgroundColor,
    theme_color: pwa.themeColor,
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
