# InvestmentTracker 投资组合管理工具

<div align="center">

**一款专业的桌面投资组合管理工具，帮助您轻松追踪和分析投资表现**

![GitHub stars](https://img.shields.io/github/stars/Deewooo/InvestmentTracker?style=social)
![GitHub forks](https://img.shields.io/github/forks/Deewooo/InvestmentTracker?style=social)
![GitHub watchers](https://img.shields.io/github/watchers/Deewooo/InvestmentTracker?style=social)

![Tech Stack](https://img.shields.io/badge/Tauri-2.2-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![Rust](https://img.shields.io/badge/Rust-1.70+-CE422B)
![License](https://img.shields.io/badge/license-MIT-green)
![Last Commit](https://img.shields.io/github/last-commit/Deewooo/InvestmentTracker)
![Issues](https://img.shields.io/github/issues/Deewooo/InvestmentTracker)

[功能介绍](#-功能介绍) • [快速开始](#-快速开始) • [项目结构](#-项目结构) • [文档](#-文档)

</div>

---

## 📖 项目简介

InvestmentTracker 是一个基于 **Tauri + Next.js + Rust** 构建的现代化投资组合管理系统。它提供了一个轻量级的桌面应用，让投资者能够：

- 📊 **精确记录** 每一笔投资交易
- 📈 **实时监控** 投资组合的盈亏状况
- 💼 **灵活管理** 多个投资策略组合
- 🔒 **隐私安全** 所有数据存储在本地，完全离线

### 为什么选择 InvestmentTracker？

| 特性 | 说明 |
|------|------|
| 🖥️ **跨平台桌面应用** | 基于 Tauri 技术，轻量级高效率 |
| 💾 **本地数据存储** | SQLite 数据库，数据完全隐私安全 |
| ⚡ **高性能** | Rust 后端驱动，快速响应 |
| 🎨 **现代化 UI** | React 19 + Tailwind CSS，美观易用 |
| 📱 **响应式设计** | 适配各种屏幕尺寸 |

---

## ✨ 功能介绍

### 1. 📊 持仓列表
- 查看所有持仓的完整信息
- 显示买入价、当前价、盈亏金额和盈亏比
- 支持买入范围和卖出范围的推荐建议
- 历史交易记录详情
- **股票信息自动获取**：输入股票代码后自动获取股票名称和实时价格
- **股票代码规范化**：自动统一为小写存储，确保数据一致性

### 2. 💼 投资组合管理
- 支持创建和管理多个独立的投资组合
- 按策略分组管理不同的投资方案
- 每个组合独立统计盈亏
- 灵活的组合容量配置

### 3. 📈 盈亏视图（核心功能）
**完整的投资分析仪表板**
- **组合级统计**：总盈亏、平均收益率、总持仓成本
- **股票级统计**：单支股票的盈亏分析
- **交易明细**：可展开查看每笔交易的具体信息
  - 自适应换行表格：根据窗口宽度自动调整列数
  - 买入日期、买入价格、数量、盈亏、盈亏比
- **智能建议**：基于历史价格的买入/卖出推荐点
- **颜色指示**：红色盈利、绿色亏损，一目了然

### 4. 💰 平仓与减仓功能
**灵活的仓位管理**
- **完整平仓**：卖出全部持仓，记录卖出价格和日期
- **灵活减仓**：部分卖出持仓，支持分批止盈
  - 快捷百分比选择（25%, 50%, 75%）
  - 实时盈亏预览
  - 自动拆分记录，保留交易历史
- **"当前价"快捷填充**：一键使用实时价格
- **智能关联**：通过 parent_id 追踪持仓拆分关系

### 5. 🔄 交易记录
- 完整的交易历史记录
- 买入、卖出、平仓操作追踪
- 支持数据导入导出

---

## 🚀 快速开始

### 系统要求
```
- Node.js 18 或更高版本
- Rust 1.70 或更高版本
- npm 或 pnpm
- macOS / Windows / Linux
```

### 安装步骤

**1. 克隆项目**
```bash
git clone https://github.com/yourusername/InvestmentTracker.git
cd InvestmentTracker
```

**2. 安装依赖**
```bash
npm install
```

**3. 启动开发模式**
```bash
npm run dev
```
Tauri 会自动启动 Next.js 前端（端口 3001）和桌面应用窗口。

**4. 打开应用**
- 桌面应用窗口会自动弹出
- 开始添加持仓记录

### 其他有用命令

```bash
# 仅启动 Next.js 前端（用于 Web 调试）
npm run next:dev

# 构建生产版本
npm run build

# 代码检查和格式化
npm run lint

# Tauri 特定命令
npm run tauri

# 查看所有可用命令
npm run
```

---

## 🏗️ 项目结构

```
InvestmentTracker/
├── 📂 src/                          # 前端应用（Next.js + React）
│   ├── app/                         # Next.js App Router
│   │   ├── page.tsx                 # 主页面
│   │   ├── layout.tsx               # 根布局
│   │   └── globals.css              # 全局样式
│   ├── components/                  # React 组件
│   │   ├── HomePage.tsx             # 主页面组件
│   │   ├── PositionList.tsx         # 持仓列表
│   │   ├── Portfolio.tsx            # 投资组合视图
│   │   └── PortfolioProfitLossView/ # 盈亏视图（核心）
│   ├── lib/                         # 工具库
│   │   ├── db.ts                    # Tauri 数据库 API
│   │   └── types.ts                 # TypeScript 类型定义
│   └── public/                      # 静态资源
│
├── 📂 src-tauri/                    # 后端应用（Rust + Tauri）
│   ├── src/
│   │   ├── main.rs                  # 应用入口
│   │   ├── db/                      # 数据库模块
│   │   │   ├── mod.rs               # 模块声明
│   │   │   ├── sqlite.rs            # SQLite 连接管理
│   │   │   ├── portfolio_service.rs # 投资组合聚合服务
│   │   │   └── models.rs            # 数据模型
│   │   ├── models/                  # 数据模型定义
│   │   ├── error.rs                 # 错误处理
│   │   └── commands/                # Tauri 命令
│   └── Cargo.toml                   # Rust 依赖配置
│
├── 📂 docs/                         # 项目文档
│   ├── project-structure.md         # 详细项目结构说明
│   ├── migration-plan.md            # Java 版本迁移计划
│   ├── gap-analysis.md              # 功能差距分析
│   ├── storage-design.md            # 数据存储设计
│   └── code-review.md               # 代码审查建议
│
├── package.json                     # Node.js 项目配置
├── tsconfig.json                    # TypeScript 配置
├── tailwind.config.ts               # Tailwind CSS 配置
├── next.config.ts                   # Next.js 配置
└── README.md                        # 本文件
```

---

## 🛠️ 技术栈

### 前端技术
| 技术 | 版本 | 用途 |
|------|------|------|
| **Next.js** | 15 | React 框架，App Router 路由 |
| **React** | 19 | UI 库 |
| **TypeScript** | 5.7 | 类型安全编程 |
| **Tailwind CSS** | 3.4 | 样式框架 |
| **Shadcn/ui** | 最新 | 高级 UI 组件库 |

### 后端技术
| 技术 | 版本 | 用途 |
|------|------|------|
| **Tauri** | 2.2 | 桌面应用框架 |
| **Rust** | 1.70+ | 系统编程语言 |
| **SQLite** | 最新 | 轻量级数据库 |

### 特色技术特性
- 🔐 **数据安全**：所有数据存储在本地，无云同步
- ⚡ **性能优化**：Rust 驱动的后端提供高效的数据处理
- 📦 **轻量级**：应用大小优化，快速启动
- 🔄 **实时更新**：前后端通信实时响应

---

## 📊 数据模型

### 核心数据结构
```typescript
// 持仓记录
Position {
  id: string;           // 唯一ID
  code: string;         // 股票代码
  name: string;         // 股票名称
  buy_price: number;    // 买入价格
  buy_date: string;     // 买入日期
  quantity: number;     // 买入数量
  status: string;       // 状态：POSITION 或 CLOSE
  portfolio: string;    // 所属组合
  sell_price?: number;  // 卖出价格（可选）
  sell_date?: string;   // 卖出日期（可选）
  parent_id?: string;   // 父记录ID（减仓拆分关联）
}

// 盈亏计算（单笔交易）
PositionProfitLoss {
  profit_loss: number;        // 盈亏金额
  profit_loss_rate: number;   // 盈亏比例
}

// 股票级汇总
TargetProfitLoss {
  code: string;
  cost_position_rate: number;           // 成本仓位占比
  target_profit_loss: number;           // 总盈亏
  target_profit_loss_rate: number;      // 盈亏比
  recommended_buy_in_point: number;     // 推荐买入点
  recommended_sale_out_point: number;   // 推荐卖出点
}

// 组合级汇总
PortfolioProfitLoss {
  portfolio: string;
  sum_position_cost: number;      // 总持仓成本
  sum_profit_losses: number;      // 总盈亏
  sum_profit_losses_rate: number; // 总盈亏比
}
```

---

## 📚 文档导航

### 快速参考
| 文档 | 内容 |
|------|------|
| **[项目结构](./docs/project-structure.md)** | 详细的目录和文件说明 |
| **[迁移计划](./docs/migration-plan.md)** ⭐ | Java 版本完整迁移计划 |
| **[功能差距分析](./docs/gap-analysis.md)** | 与 Java 版本的对比 |
| **[存储方案设计](./docs/storage-design.md)** | 数据库架构和 API 设计 |
| **[代码审查](./docs/code-review.md)** | 优化建议和最佳实践 |

### 开发指南
- [环境配置](./docs/project-structure.md#环境配置)
- [API 文档](./docs/storage-design.md#api-接口)
- [数据库设计](./docs/storage-design.md#数据库设计)

---

## 🔧 开发指南

### 项目架构

#### 前端 → 后端通信
```
React Component
    ↓
lib/db.ts (Tauri API)
    ↓
Tauri Commands (@tauri-apps/api/core)
    ↓
Rust Backend
    ↓
SQLite Database
```

#### 添加新功能步骤
1. **定义数据类型**：在 `src/lib/types.ts` 添加 TypeScript 类型
2. **实现 Rust 逻辑**：在 `src-tauri/src/` 编写后端代码
3. **创建 Tauri 命令**：在 `src-tauri/src/commands/` 暴露接口
4. **编写前端调用**：在 `src/lib/db.ts` 添加 API 方法
5. **创建 React 组件**：在 `src/components/` 实现 UI

### 调试技巧
```bash
# 启用 Tauri 开发者工具
TAURI_DEBUG=true npm run dev

# 查看 Rust 编译错误
npm run tauri build

# 前端独立调试
npm run next:dev  # 访问 http://localhost:3000
```

---

## 🚧 开发状态

### 已完成功能
- ✅ 持仓列表显示和管理
- ✅ 投资组合多组支持
- ✅ 盈亏视图和数据分析
- ✅ 自适应交易明细表格
- ✅ SQLite 数据持久化
- ✅ Tauri 桌面应用集成
- ✅ 股票信息自动获取（名称和实时价格）
- ✅ 股票代码规范化（统一小写存储）
- ✅ 投资组合智能选择（下拉选择+手动输入）
- ✅ 买入时间精确到天（不需要分钟精度）
- ✅ **灵活减仓功能**（v0.1.1 新增）
- ✅ **完善平仓操作**（v0.1.1 新增）
- ✅ **实时数据刷新**（v0.1.1 新增）
- ✅ **持仓拆分追踪**（v0.1.1 新增）

### 规划中的功能
- 🔜 数据导入导出（CSV/Excel）
- 🔜 图表和数据可视化
- 🔜 更多实时行情数据（完整的K线图、技术指标等）
- 🔜 批量操作功能
- 🔜 报表生成
- 🔜 备份和恢复

---

## 💡 常见问题

**Q: 数据会被上传到云端吗？**
A: 不会。所有数据都存储在本地 SQLite 数据库，完全离线，隐私安全。

**Q: 支持哪些操作系统？**
A: 支持 macOS、Windows 和 Linux。Tauri 确保跨平台兼容性。

**Q: 如何导入已有的投资记录？**
A: 目前支持手动添加。未来计划支持 CSV 导入功能。

**Q: 可以同时管理多个投资组合吗？**
A: 完全支持。每个组合独立统计，互不影响。

**Q: 应用多大？需要什么配置？**
A: 应用大小约 50-100MB，对系统要求很低。任何现代计算机都可以运行。

---

## 🤝 参与贡献

我们欢迎各种形式的贡献！

### 贡献方式
1. **报告问题**：提交 Issue 描述遇到的问题
2. **功能建议**：在 Discussions 中提出新功能想法
3. **代码贡献**：Fork 项目，提交 Pull Request
4. **文档改进**：改进文档的清晰度和完整性

### 贡献流程
```bash
# 1. Fork 项目
# 2. 创建功能分支
git checkout -b feature/AmazingFeature

# 3. 提交变更
git commit -m 'Add some AmazingFeature'

# 4. 推送到分支
git push origin feature/AmazingFeature

# 5. 开启 Pull Request
```

---

## 📝 开源协议

本项目采用 **MIT 许可证**。详见 [LICENSE](./LICENSE) 文件。

### 为什么选择 MIT 许可证？

MIT 是目前最宽松、最流行的开源许可证之一。我们选择它是基于以下考虑：

#### ✅ 对用户的意义
- **完全免费使用**：无论个人还是商业用途，都可以免费使用本工具
- **自由修改**：你可以根据自己的需求修改代码，定制属于你的版本
- **可商业化**：如果你愿意，甚至可以基于此项目开发商业产品
- **无强制开源**：你的修改版本不需要开源（但我们鼓励贡献回社区）

#### 🤝 对贡献者的意义
- **低门槛参与**：MIT 协议简单易懂，没有复杂的法律条款
- **灵活性高**：你的贡献不会被限制在特定的使用场景
- **鼓励创新**：允许基于此项目衍生出更多创新工具

#### 💡 对项目发展的价值
- **降低使用门槛**：让更多投资新手敢于尝试和使用
- **鼓励社区贡献**：简单的协议更容易吸引开发者参与
- **建立技术品牌**：开放的态度有助于项目长期发展

### 免责声明

本项目按"原样"提供，不提供任何明示或暗示的保证。使用本工具进行投资决策的风险由用户自行承担。作者不对使用本软件产生的任何损失负责。

**投资有风险，决策需谨慎。本工具仅用于记录和分析，不构成任何投资建议。**

---

## 👨‍💻 作者

**Deewooo** - 独立开发者

- GitHub: [@Deewooo](https://github.com/Deewooo)
- 项目链接: [InvestmentTracker](https://github.com/Deewooo/InvestmentTracker)

---

## 🙏 致谢

感谢所有贡献者和用户的支持！

- 感谢 [Tauri](https://tauri.app/) 团队提供优秀的桌面框架
- 感谢 [Vercel](https://vercel.com/) 提供 Next.js
- 感谢 [Shadcn](https://shadcn.com/) 的 UI 组件库

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给个 Star！**

Made with ❤️ by Deewooo

**版本**: v0.1.1 | **最后更新**: 2025-11-12

</div>
