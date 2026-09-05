import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/providers/app-providers";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Baumans, Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const baumans = Baumans({ subsets: ["latin"], weight: "400", variable: "--font-baumans" });

export const metadata: Metadata = {
  title: "Billora Technologies | Make the next thing matter",
  description: "Billora Technologies creates useful, beautiful digital products for ambitious teams.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn("h-full antialiased", inter.variable, baumans.variable)}>
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          <AppProviders>{children}</AppProviders>
          <Toaster position="top-right" />
        </TooltipProvider>
      </body>
    </html>
  );
}
