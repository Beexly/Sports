import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./social.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ground: "#08090C",
        panel: "#12141A",
        "panel-2": "#191C23",
        line: "#31353F",
        bone: "#EDE8E0",
        fog: "#C4BFB6",
        mist: "#8F8A82",
        ember: "#FF4D2E",
        paper: "#F4F1EB",
        ink: "#101114",
      },
      fontFamily: {
        display: ["Big Shoulders", "sans-serif"],
        data: ["IBM Plex Sans", "sans-serif"],
      },
      fontVariantNumeric: {
        data: "tabular-nums lining-nums",
      },
    },
  },
} satisfies Config;
