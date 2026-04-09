/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "26mb",
    },
  },
};

module.exports = nextConfig;
