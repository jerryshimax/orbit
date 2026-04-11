import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/schedule",
        destination: "/calendar",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
