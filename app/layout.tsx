import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import InstallPrompt from "@/components/InstallPrompt";
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
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300;1,9..40,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
        <ServiceWorkerRegistration />
        <InstallPrompt />
        <Analytics />
      </body>
    </html>
  );
}
