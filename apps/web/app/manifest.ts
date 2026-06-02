import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "pixelFund AI",
    short_name: "pixelFund",
    description: "Pixel-art stock trading simulation with AI specialist agents.",
    start_url: "/",
    display: "standalone",
    background_color: "#d7c9a5",
    theme_color: "#0c7c59",
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" }
    ]
  };
}
