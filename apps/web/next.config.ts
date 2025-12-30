import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Required for Docker deployment
  // Transpile packages from node_modules (needed for pnpm workspaces)
  transpilePackages: [
    '@aptos-labs/wallet-adapter-react',
  ],
  // Turbopack configuration (Next.js 16 default)
  turbopack: {
    // Turbopack handles most things automatically, but we can add config here if needed
  },
  // Handle wallet adapter and its dependencies (for webpack fallback if needed)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude server-only packages from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  // Externalize only server-side packages that cause issues
  serverExternalPackages: [
    '@aptos-labs/ts-sdk',
  ],
};

export default nextConfig;
