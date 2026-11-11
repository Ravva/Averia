import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/invite/[token]": ["./lib/seed/**"],
  },
};

export default nextConfig;