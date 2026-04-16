/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "26mb",
    },
  },
  webpack: (config) => {
    // pdfjs-dist optionally imports 'canvas' for Node.js; stub it out
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;
