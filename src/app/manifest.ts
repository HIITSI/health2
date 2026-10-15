import type { MetadataRoute } from "next";
import { appName } from "@/lib/config";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: appName,
    short_name: appName,
    description: "개인 건강 기록",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f8fc",
    theme_color: "#2563eb",
    lang: "ko",
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
    ],
  };
}
