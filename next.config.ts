import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@databricks/sql", "lz4"],
  poweredByHeader: false,
  turbopack: { root: process.cwd() },
  async headers() {
    const development = process.env.NODE_ENV === "development";
    const policy = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'", "font-src 'self'",
      "img-src 'self' data: blob: https://*.basemaps.cartocdn.com",
      `connect-src 'self'${development ? " ws: wss:" : ""}`, "media-src 'self'",
      "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
    ].join("; ");
    return [{ source: "/:path*", headers: [
      { key: "Content-Security-Policy", value: policy },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ] }];
  },
};

export default nextConfig;
