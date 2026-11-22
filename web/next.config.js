/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Hide the Next.js "N" / Turbopack floating badge (dev-only tooling, not part of the product)
  devIndicators: false,
  // Keep error overlay from swallowing focus on known VAPI/Daily teardown noise
  logging: {
    fetches: { fullUrl: false },
  },
};

module.exports = nextConfig;
