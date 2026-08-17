import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kürbis Erntejournal",
    short_name: "Erntejournal",
    description: "Erfassung von Paletten beim Wareneingang",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#ea580c",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
