import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: "standalone",
  basePath: "/student",
  transpilePackages: ["@layai/ui", "@layai/store", "@layai/utils", "@layai/types"],
};

export default nextConfig;