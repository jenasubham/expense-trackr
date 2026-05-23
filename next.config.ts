import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ts-ignore
  allowedDevOrigins: ['192.168.206.139', '192.168.0.107', '192.168.203.106'],
};

export default nextConfig;
// Forced restart to clear route cache
