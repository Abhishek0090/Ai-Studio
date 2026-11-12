import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "AI Studio",
    short_name: "AI Studio",
    description: "Create images, videos, shorts and code with AI.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#08090f",
    theme_color: "#dc2626",
    categories: ["productivity", "photo", "utilities"],
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Image gen", url: "/dashboard/image", icons: [{ src: "/icons/192", sizes: "192x192" }] },
      { name: "Code gen", url: "/dashboard/code", icons: [{ src: "/icons/192", sizes: "192x192" }] },
      { name: "Buy coins", url: "/dashboard/billing", icons: [{ src: "/icons/192", sizes: "192x192" }] },
    ],
  };
}
