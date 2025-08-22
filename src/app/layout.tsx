import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { EnvConfigProvider } from "@/providers/EnvConfig";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Deep Agent UI",
  description: "A UI for running and optimizing deep agents",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <body
        className={inter.className}
        suppressHydrationWarning
      >
        <EnvConfigProvider>
          <NuqsAdapter>{children}</NuqsAdapter>
          <Toaster />
        </EnvConfigProvider>
      </body>
    </html>
  );
}
