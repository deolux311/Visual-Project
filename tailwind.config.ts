import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1f2937",
        muted: "#667085",
        line: "#d8dee8",
        report: "#f5f7fb",
        teal: {
          650: "#0f766e",
          750: "#115e59"
        }
      },
      boxShadow: {
        panel: "0 12px 36px rgba(31, 41, 55, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
