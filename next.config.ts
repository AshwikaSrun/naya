import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ebayimg.com',
      },
      {
        protocol: 'https',
        hostname: 'media-photos.depop.com',
      },
      {
        protocol: 'https',
        hostname: '**.depop.com',
      },
      {
        protocol: 'https',
        hostname: 'v3.fal.media',
      },
      {
        protocol: 'https',
        hostname: '**.fal.media',
      },
      {
        protocol: 'https',
        hostname: 'fal.media',
      },
    ],
  },
};

export default nextConfig;
