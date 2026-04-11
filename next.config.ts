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
      {
        source: "/brief",
        destination: "/focus",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
