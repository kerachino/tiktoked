import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // 静的エクスポートを有効化（Netlify用）
  trailingSlash: true, // トレイリングスラッシュを追加
  images: {
    unoptimized: true, // Netlifyで画像最適化を無効化
  },
};

export default nextConfig;
