import type { NextConfig } from "next";

// The transcription Web Worker lives in /public and loads transformers.js from a
// CDN at runtime, so nothing here needs to bundle the ML runtime. We add a long
// cache header for the worker (Vercel edge / Fast Origin Transfer friendly).
// All SEO pages are statically generated.
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/transcribe.worker.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
