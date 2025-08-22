/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
    "./agent/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
        full: "var(--radius-full)",
      },
      components: {
        ".scrollbar-pretty":
          "overflow-y-scroll [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent",
      },
      colors: {
        // App-specific colors
        primary: {
          DEFAULT: "var(--color-primary)",
          dark: "var(--color-primary-dark)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          dark: "var(--color-secondary-dark)",
        },
        success: {
          DEFAULT: "var(--color-success)",
          dark: "var(--color-success-dark)",
        },
        warning: {
          DEFAULT: "var(--color-warning)",
          dark: "var(--color-warning-dark)",
        },
        error: {
          DEFAULT: "var(--color-error)",
          dark: "var(--color-error-dark)",
        },
        background: {
          DEFAULT: "var(--color-background)",
          dark: "var(--color-background-dark)",
        },
        surface: {
          DEFAULT: "var(--color-surface)",
          dark: "var(--color-surface-dark)",
        },
        border: {
          DEFAULT: "var(--color-border)",
          light: "var(--color-border-light)",
          dark: "var(--color-border-dark)",
          "light-dark": "var(--color-border-light-dark)",
        },
        text: {
          primary: {
            DEFAULT: "var(--color-text-primary)",
            dark: "var(--color-text-primary-dark)",
          },
          secondary: {
            DEFAULT: "var(--color-text-secondary)",
            dark: "var(--color-text-secondary-dark)",
          },
          tertiary: {
            DEFAULT: "var(--color-text-tertiary)",
            dark: "var(--color-text-tertiary-dark)",
          },
        },
        "user-message": {
          DEFAULT: "var(--color-user-message)",
          dark: "var(--color-user-message-dark)",
        },
        "avatar-bg": {
          DEFAULT: "var(--color-avatar-bg)",
          dark: "var(--color-avatar-bg-dark)",
        },
        "subagent-hover": {
          DEFAULT: "var(--color-subagent-hover)",
          dark: "var(--color-subagent-hover-dark)",
        },

        // Tailwind/Radix UI component variables
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },

        // Legacy support for existing Tailwind variables
        foreground: "hsl(var(--foreground))",
      },
      spacing: {
        xs: "var(--spacing-xs)",
        sm: "var(--spacing-sm)",
        md: "var(--spacing-md)",
        lg: "var(--spacing-lg)",
        xl: "var(--spacing-xl)",
        "2xl": "var(--spacing-2xl)",
      },
      fontFamily: {
        sans: "var(--font-family-base)",
        mono: "var(--font-family-mono)",
      },
      fontSize: {
        xs: "var(--font-size-xs)",
        sm: "var(--font-size-sm)",
        base: "var(--font-size-base)",
        lg: "var(--font-size-lg)",
        xl: "var(--font-size-xl)",
        "2xl": "var(--font-size-2xl)",
        "3xl": "var(--font-size-3xl)",
      },
      fontWeight: {
        medium: "var(--font-weight-medium)",
        semibold: "var(--font-weight-semibold)",
      },
      lineHeight: {
        tight: "var(--line-height-tight)",
        normal: "var(--line-height-normal)",
        relaxed: "var(--line-height-relaxed)",
      },
      boxShadow: {
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
      },
      transitionDuration: {
        base: "var(--transition-base)",
      },
      width: {
        sidebar: "var(--sidebar-width)",
        "sidebar-collapsed": "var(--sidebar-collapsed-width)",
        panel: "var(--panel-width)",
        "chat-max": "var(--chat-max-width)",
      },
      height: {
        header: "var(--header-height)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
