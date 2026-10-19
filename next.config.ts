import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg"],
  devIndicators: false,
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      { source: "/products", destination: "/inventory", permanent: false },
      { source: "/:slug/products", destination: "/:slug/inventory", permanent: false },
    ];
  },
};

export default nextConfig;
