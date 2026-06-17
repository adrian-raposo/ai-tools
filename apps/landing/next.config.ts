import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    scrollRestoration: false,
  },
};

export default nextConfig;
