import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "export", // 启用静态导出
  basePath: "", // 适配Tauri的路径
  // ... existing compiler config ...
};

export default nextConfig;
