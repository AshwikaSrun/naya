import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.nayaeditorial.shop"),
  icons: { icon: "/icon.svg" },
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
  title: "naya — second-hand shopping, simplified",
  description:
    "Search second-hand listings in one place. Built for college students who want better style, better prices, and less waste.",
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
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300;1,9..40,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="antialiased"
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
