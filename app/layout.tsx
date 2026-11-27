import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { ToastProvider } from "@/components/toast-provider";
import { CookieBanner } from "@/components/cookie-banner";
import { ChatLauncher } from "@/components/assistant/chat-launcher";
import { AuthProvider } from "@/lib/contexts/auth-context";
import { ThemeProvider } from "@/lib/contexts/theme-context";

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://cheescoequiphub.com").replace(/\/+$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(appUrl.includes("test.example.com") ? "https://cheescoequiphub.com" : appUrl),
  title: {
    default: "Cheesco Equip Hub — Heavy Equipment Marketplace & Managed Rentals",
    template: "%s | Cheesco Equip Hub",
  },
  description:
    "Nigeria's trusted intermediary for heavy equipment sales, managed rentals, verified sourcing, and industrial logistics. Every transaction verified by Cheesco.",
  keywords: [
    "heavy equipment rental Nigeria",
    "excavator hire Lagos",
    "crane lease Port Harcourt",
    "bulldozer rental Abuja",
    "construction machinery marketplace",
    "verified fleet equipment Nigeria",
    "Cheesco Equip Hub",
  ],
  authors: [{ name: "Cheesco Equip Hub", url: "https://cheescoequiphub.com" }],
  creator: "Cheesco Engineering & Equipment Hub",
  publisher: "Cheesco Equip Hub",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Cheesco Equip Hub — Heavy Equipment Marketplace & Managed Rentals",
    description:
      "Nigeria's verified intermediary for heavy machinery rentals, equipment sales, certified operators, and industrial logistics.",
    url: "https://cheescoequiphub.com",
    siteName: "Cheesco Equip Hub",
    locale: "en_NG",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Cheesco Equip Hub — Heavy Machinery Fleet in Nigeria",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cheesco Equip Hub — Heavy Equipment Marketplace & Managed Rentals",
    description:
      "Nigeria's verified intermediary for heavy machinery rentals, equipment sales, certified operators, and industrial logistics.",
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0D14",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
      data-theme="light"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-canvas text-ink" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <ToastProvider />
            <CookieBanner />
            <ChatLauncher />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
