# InvestmentTracker 完整迁移总结

## 📋 项目概述

本次工作完成了 InvestmentTracker 从 Java 版本到 Rust/Tauri + Next.js 的完整数据模型和服务架构迁移。

---

## ✅ 完成的工作清单

### 1️⃣ 后端架构（Rust/Tauri）

#### 数据模型 (`src-tauri/src/models/quote.rs`)
- ✅ **RealQuote**: 实时行情数据结构
  - code: 股票代码
  - name: 股票名称
  - real_price: 实时价格

- ✅ **PositionProfitLoss**: 单笔交易盈亏计算（对应Java的PositionProfitLoss）
  - 包含交易详情：购买日期、价格、数量
  - 计算字段：持仓成本、盈亏金额、盈亏比

- ✅ **TargetProfitLoss**: 股票级汇总（某个投资组合中的某支股票）
  - 聚合同一股票的所有交易
  - 关键指标：成本仓位、当前仓位、总盈亏、盈亏比
  - 建议点：建议买入点（最近买入价×0.9）、建议卖出点（最近买入价×1.1）

- ✅ **PortfolioProfitLoss**: 投资组合级汇总
  - 聚合所有股票的汇总数据
  - 关键指标：总持仓成本、总盈亏、总盈亏比

#### 服务层

- ✅ **QuoteService** (`src-tauri/src/db/quote_service.rs`)
  - 实时价格获取（支持腾讯财经API格式）
  - 模拟数据生成（开发阶段使用）
  - 异步数据处理

- ✅ **PortfolioService** (`src-tauri/src/db/portfolio_service.rs`)
  - 完整的数据聚合逻辑
  - 多层次分组：按投资组合 → 按股票代码 → 计算聚合指标
  - 准确的数学计算：
    ```
    成本仓位 = SUM(buyPrice × quantity) / 满仓金额(50000)
    当前仓位 = (realPrice × totalQty) / 满仓金额
    盈亏 = SUM((realPrice - buyPrice) × quantity)
    盈亏比 = 盈亏 / 总成本
    ```

#### Tauri Commands
- ✅ 新增 `get_portfolio_profit_loss_view` 命令
  - 参数：`use_mock` (boolean) - 是否使用模拟数据
  - 返回：`Vec<PortfolioProfitLoss>` - 完整的投资组合盈亏视图

#### 依赖管理 (`src-tauri/Cargo.toml`)
- ✅ 添加 `reqwest` 0.11 (HTTP请求库)
- ✅ 添加 `tokio` 1.x (异步运行时)

### 2️⃣ 前端集成（TypeScript/Next.js）

#### 类型定义 (`src/lib/types.ts`)
- ✅ RealQuote (实时行情)
- ✅ PositionProfitLoss (单笔交易盈亏)
- ✅ TargetProfitLoss (股票级汇总)
- ✅ PortfolioProfitLoss (投资组合级汇总)

#### API 层 (`src/lib/db.ts`)
- ✅ 新增 `getPortfolioProfitLossView()` 方法
  - 与后端 `get_portfolio_profit_loss_view` 命令对应
  - 支持模拟数据和真实API切换

#### 前端组件 (`src/components/PortfolioProfitLossView.tsx`)
- ✅ 完整的投资组合盈亏视图组件
- ✅ 功能特性：
  - 投资组合级汇总卡片（显示总成本、总盈亏）
  - 股票卡片列表（支持展开/收起）
  - 交易明细表格（点击股票卡片展开）
  - 实时数据加载和刷新
  - 错误处理和加载状态
  - 颜色编码（绿色正收益、红色亏损）

#### 页面集成 (`src/components/HomePage.tsx`)
- ✅ 新增"盈亏视图"标签页
- ✅ 导航菜单支持三个视图：
  - 持仓列表
  - 投资组合
  - 盈亏视图（新增）

---

## 🏗️ 架构流程图

```
数据库 (positions 表)
   ↓ (所有未平仓交易)
PositionRepository::find_positions()
   ↓ (按投资组合和股票代码分组)
PortfolioService::aggregate_positions()
   ↓ (获取实时价格)
QuoteService::fetch_real_quotes()
   ↓ (计算盈亏指标)
PortfolioProfitLoss (完整的投资组合视图)
   ↓
后端 Tauri Command: get_portfolio_profit_loss_view
   ↓
前端 API: db.getPortfolioProfitLossView()
   ↓
React Component: PortfolioProfitLossView
   ↓
用户界面展示
```

---

## 📊 数据结构示例

### 输入数据（Position 表中的交易记录）
```
id: "uuid-123"
code: "600519"
name: "贵州茅台"
buy_price: 1680.5
buy_date: "2025-01-01"
quantity: 100
status: "POSITION"
portfolio: "白马成长"
```

### 输出数据（PortfolioProfitLoss）
```json
{
  "portfolio": "白马成长",
  "full_position": 50000,
  "sum_position_cost": 82502.00,
  "sum_profit_losses": -31393.00,
  "sum_profit_losses_rate": -0.380512,
  "target_profit_losses": [
    {
      "code": "000725",
      "name": "京东方A",
      "real_price": 4.0100,
      "cost_position_rate": 0.096000,
      "current_position_rate": 0.080200,
      "target_profit_loss": -790.0000,
      "target_profit_loss_rate": -0.164583,
      "position_profit_losses": [
        {
          "id": "uuid-456",
          "buy_date": "2022-03-01",
          "buy_price": 4.69,
          "quantity": 500,
          "position_cost": 2345.00,
          "profit_loss": -340.00,
          "profit_loss_rate": -0.144989
        },
        ...
      ]
    }
  ]
}
```

---

## 🔄 核心计算逻辑

### 对于每个TargetProfitLoss（股票级）：

```rust
// 成本仓位占比
cost_position_rate = SUM(buyPrice × quantity) / 50000

// 当前仓位占比
current_position_rate = (realPrice × totalQty) / 50000

// 总盈亏
target_profit_loss = SUM((realPrice - buyPrice) × quantity)

// 盈亏比
target_profit_loss_rate =
  if total_cost > 0:
    target_profit_loss / total_cost
  else:
    0.0
```

### 对于PortfolioProfitLoss（组合级）：

```rust
// 总持仓成本
sum_position_cost = SUM(targetCostPosition × fullPosition)

// 总盈亏
sum_profit_losses = SUM(targetProfitLoss)

// 总盈亏比
sum_profit_losses_rate =
  if sum_position_cost > 0:
    sum_profit_losses / sum_position_cost
  else:
    0.0
```

---

## 🔌 API 端点

### Tauri Command

**名称**: `get_portfolio_profit_loss_view`

**参数**:
```rust
use_mock: Option<bool>  // true: 使用模拟数据，false: 调用真实API
```

**返回类型**:
```rust
Vec<PortfolioProfitLoss>
```

**使用示例**（前端）:
```typescript
const portfolios = await db.getPortfolioProfitLossView(true);
// 返回所有投资组合的完整盈亏视图
```

---

## 🧪 测试数据

### 模拟数据生成

QuoteService 提供了 `mock_quotes()` 方法用于开发测试：

```rust
pub fn mock_quotes(codes: Vec<String>) -> HashMap<String, RealQuote> {
    // 为每个股票代码生成模拟价格数据
}
```

### 开发环境

在开发阶段，使用 `use_mock=true` 参数调用后端 API：

```typescript
const data = await db.getPortfolioProfitLossView(true);  // 使用模拟数据
```

### 生产环境

在生产环境，使用真实API数据：

```typescript
const data = await db.getPortfolioProfitLossView(false);  // 使用真实API
```

---

## 📁 文件结构

```
src-tauri/src/
├── models/
│   ├── mod.rs (新增导出)
│   ├── position.rs (现有)
│   └── quote.rs (新增)
├── db/
│   ├── mod.rs (新增导出)
│   ├── position_repo.rs (现有)
│   ├── quote_service.rs (新增)
│   └── portfolio_service.rs (新增)
├── commands/
│   └── position.rs (新增命令)
├── main.rs (新增命令注册)
└── migration.rs (现有)

src/
├── components/
│   ├── PortfolioProfitLossView.tsx (新增)
│   ├── HomePage.tsx (修改：添加新标签页)
│   └── ...
├── lib/
│   ├── db.ts (新增方法)
│   └── types.ts (新增类型)
└── ...
```

---

## 🚀 快速开始

### 1. 后端构建验证
```bash
cd src-tauri
cargo check --manifest-path Cargo.toml
```

### 2. 前端 TypeScript 检查
```bash
npx tsc --noEmit
```

### 3. 运行开发服务器
```bash
npm run dev
```

### 4. 使用新功能
- 打开应用
- 导航到"盈亏视图"标签页
- 查看投资组合的完整盈亏数据

---

## 🔑 关键改进

✅ **完整的数据聚合**: 从交易记录自动计算投资组合级别的统计数据

✅ **精确的数学计算**: 按Java版本的逻辑完全复现

✅ **灵活的价格源**: 支持模拟数据和真实API的切换

✅ **类型安全**: TypeScript 和 Rust 的强类型保证

✅ **用户友好的UI**: 可展开的股票卡片、颜色编码的盈亏显示

✅ **错误处理**: 完整的异步错误捕获和用户提示

---

## 📝 后续工作

1. **实时数据**: 集成真实的股票API（如腾讯财经、新浪等）
2. **数据缓存**: 实现价格数据的缓存机制，减少API调用
3. **定期更新**: 实现后台定时更新价格数据
4. **历史数据**: 添加盈亏数据的历史追踪
5. **导出功能**: 支持导出投资组合数据到 Excel/CSV

---

## 📞 相关文件参考

- 后端模型: [src-tauri/src/models/quote.rs](src-tauri/src/models/quote.rs)
- 后端服务: [src-tauri/src/db/portfolio_service.rs](src-tauri/src/db/portfolio_service.rs)
- 前端组件: [src/components/PortfolioProfitLossView.tsx](src/components/PortfolioProfitLossView.tsx)
- 前端类型: [src/lib/types.ts](src/lib/types.ts)

---

**完成日期**: 2025-11-09
**迁移状态**: ✅ 完成
**版本**: 1.0.0
