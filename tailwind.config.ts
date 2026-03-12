import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#3B82F6",
      },
      typography: {
        DEFAULT: {
          css: {
            '--tw-prose-links': '#3B82F6',
            '--tw-prose-bold': '#3B82F6',
            a: {
              color: '#3B82F6',
              '&:hover': {
                color: '#2563EB',
              },
            },
          },
        },
        invert: {
          css: {
            '--tw-prose-links': '#93C5FD',
            '--tw-prose-bold': '#93C5FD',
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
export default config;
