import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}", "./server/**/*.ts", "./remotion/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101412",
        muted: "#727a74",
        line: "#dedbd0",
        brand: {
          blue: "#2458d6",
          navy: "#09130f",
          green: "#1d7c63",
          cyan: "#1aa6a3"
        }
      },
      boxShadow: {
        soft: "0 16px 44px rgba(28, 32, 29, 0.09)",
        lift: "0 30px 90px rgba(28, 32, 29, 0.14)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"]
      }
    }
  },
  plugins: []
} satisfies Config;
