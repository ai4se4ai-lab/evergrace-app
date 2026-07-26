import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The prototype's static reference files live at the repo root and are not
  // part of the Next build. Keep the build surface to src/ + prisma/.
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    // Server Actions are used for every mutation that does not need a webhook.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
