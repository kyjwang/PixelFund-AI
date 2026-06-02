import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        desk: "#5e412f",
        wall: "#d7c9a5",
        accent: "#0c7c59"
      },
      fontFamily: {
        pixel: ["var(--font-pixel)", "monospace"]
      }
    }
  },
  plugins: []
} satisfies Config;
