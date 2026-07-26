import type { Config } from "tailwindcss";

/**
 * Every color is an indirection onto a CSS custom property so that the
 * light / dark / high-contrast token sets in `globals.css` can swap the whole
 * palette without Tailwind classes changing. See docs/DESIGN_SYSTEM.md.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        fg: "var(--fg)",
        muted: "var(--muted)",
        line: "var(--line)",
        accent: {
          DEFAULT: "var(--accent)",
          dark: "var(--accent-dark)",
          soft: "var(--accent-soft)",
        },
        success: {
          DEFAULT: "var(--success)",
          soft: "var(--success-soft)",
        },
        warn: {
          DEFAULT: "var(--warn)",
          soft: "var(--warn-soft)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Baloo 2", "Public Sans", "sans-serif"],
        body: ["var(--font-body)", "Public Sans", "system-ui", "sans-serif"],
      },
      borderRadius: {
        control: "10px",
        card: "16px",
        modal: "20px",
      },
      minHeight: {
        touch: "44px",
        control: "52px",
        hero: "64px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,.06)",
        modal: "0 18px 60px rgba(0,0,0,.28)",
      },
      maxWidth: {
        shell: "1180px",
        prose: "68ch",
      },
    },
  },
  plugins: [],
};

export default config;
