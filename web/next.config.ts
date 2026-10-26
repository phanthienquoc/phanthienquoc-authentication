import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // The browser contract test uses this loopback origin for Next.js dev resources only.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
