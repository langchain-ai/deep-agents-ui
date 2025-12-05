import { Inter } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import { Providers } from "@/providers/Providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Deep Agent UI",
  description: "AI-powered agent interface",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
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
