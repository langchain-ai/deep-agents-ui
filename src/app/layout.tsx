import { Inter } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import { Providers } from "@/providers/Providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "SeenOS",
  description: "AI-powered agent interface - Intelligent automation platform",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "SeenOS",
    description: "AI-powered agent interface - Intelligent automation platform",
    siteName: "SeenOS",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SeenOS - AI Agent Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SeenOS",
    description: "AI-powered agent interface - Intelligent automation platform",
    images: ["/og-image.png"],
  },
};

// 内联脚本防止主题闪烁
const themeScript = `
  (function() {
    try {
      var savedTheme = localStorage.getItem('theme');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var theme = savedTheme || (prefersDark ? 'dark' : 'light');
      var root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
        root.setAttribute('data-joy-color-scheme', 'dark');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
        root.setAttribute('data-joy-color-scheme', 'light');
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <NuqsAdapter>
          <Providers>
            {children}
          </Providers>
        </NuqsAdapter>
        <Toaster />
      </body>
    </html>
  );
}
