import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Vendor shipments moved to the client portal; keep old links and bookmarks working.
    return [{ source: "/vendor/imports", destination: "/client", permanent: false }];
  },
};

export default nextConfig;
// force rebuild 1776207682
