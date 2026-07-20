import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import SmoothScroll from "@/components/SmoothScroll";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import InstallPrompt from "@/components/InstallPrompt";
import NotifyBanner from "@/components/NotifyBanner";
import FeedbackWidget from "@/components/FeedbackWidget";
import AuthProvider from "@/components/auth/AuthProvider";
import AccountRecorder from "@/components/auth/AccountRecorder";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#faf9f7",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.nayaeditorial.shop"),
  title: "naya — second-hand shopping, simplified",
  description:
    "Search second-hand listings in one place. Built for college students who want better style, better prices, and less waste.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "naya",
  },
  openGraph: {
    title: "naya — second-hand shopping, simplified",
    description:
      "Search second-hand listings in one place. Built for college students who want better style, better prices, and less waste.",
    images: ["/brands/naya-og.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "naya — second-hand shopping, simplified",
    description:
      "Search second-hand listings in one place. Built for college students who want better style, better prices, and less waste.",
    images: ["/brands/naya-og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300;1,9..144,400&family=Inter:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <SmoothScroll />
          <AccountRecorder />
          {children}
          <ServiceWorkerRegistration />
          <InstallPrompt />
          <NotifyBanner />
          <FeedbackWidget />
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
