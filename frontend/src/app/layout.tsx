import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import AppNavigation from "@/components/navigation/app-navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "BizDoctor AI",
    template: "%s | BizDoctor AI",
  },
  description:
    "AI-powered business intelligence for sales, customers, products and inventory.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        <AppNavigation />

        <main className="min-h-screen lg:pl-64">
          {children}
        </main>
      </body>
    </html>
  );
}

