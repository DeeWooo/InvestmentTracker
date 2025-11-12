/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // 静态导出，Tauri 需要
  images: {
    unoptimized: true, // 静态导出需要
  },
  experimental: {
    // outputFileTracing: true,
  },
  trailingSlash: false,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve = {
        ...config.resolve,
        fallback: {
          ...config.resolve.fallback,
          fs: false,
          path: false,
          os: false,
          crypto: false,
        },
        mainFields: ["browser", "module", "main"],
      };
    }
    return config;
  },
};

module.exports = nextConfig;
