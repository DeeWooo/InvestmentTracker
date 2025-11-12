import React from 'react';
import './globals.css';

// 移除 dynamic = 'force-dynamic'，因为静态导出需要静态渲染
// export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'InvestmentTracker',
  description: 'A desktop investment tracking tool',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 移除服务端 cookies() 调用，改为在客户端组件中处理
  // 静态导出不支持服务端 API
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
