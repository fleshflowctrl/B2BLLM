import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone is for Docker. On Vercel, Next 16.3 + standalone fails with
  // ENOENT .next/next-server.js.nft.json because the platform adapter skips that file.
  output: process.env.VERCEL ? undefined : "standalone",
  serverExternalPackages: ["@prisma/client", "pg", "mammoth", "unpdf"],
};

export default nextConfig;
