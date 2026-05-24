import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  serverExternalPackages: ["playwright", "playwright-core", "chromium"],
};

export default nextConfig;
