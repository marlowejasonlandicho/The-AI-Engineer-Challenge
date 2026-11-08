import type { NextConfig } from "next";

/**
 * Locally, the browser talks only to Next.js. These rewrites proxy `/api/*`
 * to the FastAPI app so the OpenAI key stays on the Python server.
 *
 * On a combined Vercel deploy, `vercel.json` sends `/api/*` to Python
 * directly, so the rewrite stays off unless BACKEND_URL is set (useful when
 * the frontend is deployed as its own project).
 */
const backendUrl =
  process.env.BACKEND_URL ?? (process.env.VERCEL ? "" : "http://127.0.0.1:8000");

const nextConfig: NextConfig = {
  async rewrites() {
    if (!backendUrl) {
      return [];
    }

    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
