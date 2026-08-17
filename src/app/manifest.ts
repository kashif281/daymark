import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Daymark — Daily Project Desk",
    short_name: "Daymark",
    description: "Plan project work, capture client context, and wrap up every day.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f7f5",
    theme_color: "#6d5bd0",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
