# 已平仓交易统计模块实现文档

## 概述

实现了 B 方案：新增一个独立的**已平仓交易统计服务**，用于追踪和分析所有已平仓（已卖出）的交易记录。

**特点：**
- 按卖出时间倒序排列交易
- 只显示总统计，不涉及投资组合维度的聚合
- 可直观查看交易历史和盈亏情况

---

## 后端实现

### 1. 数据模型更新 (`src-tauri/src/models/position.rs`)

#### Position 模型扩展
新增三个可选字段以完整记录已平仓交易：

```rust
pub struct Position {
    // 已有字段...
    pub sell_price: Option<f64>,      // 卖出价格
    pub sell_date: Option<String>,    // 卖出日期
    pub parent_id: Option<String>,    // 父记录ID（减仓关联）
}
```

新增两个计算方法：
- `realized_profit_loss()` - 计算已实现盈亏
- `realized_profit_loss_rate()` - 计算已实现盈亏率

#### 新增数据结构

**ClosedTrade** - 单笔已平仓交易
```rust
pub struct ClosedTrade {
    pub id: String;              // 交易ID
    pub code: String;            // 股票代码
    pub name: String;            // 股票名称
    pub buy_date: String;        // 买入日期
    pub buy_price: f64;          // 买入价格
    pub sell_date: String;       // 卖出日期
    pub sell_price: f64;         // 卖出价格
    pub quantity: i32;           // 数量
    pub profit_loss: f64;        // 盈亏金额
    pub profit_loss_rate: f64;   // 盈亏率
    pub portfolio: String;       // 所属投资组合
    pub holding_days: i32;       // 持有天数
}
```

**ClosedTradesStatistics** - 总统计数据
```rust
pub struct ClosedTradesStatistics {
    pub total_trades: usize;           // 总交易笔数
    pub profitable_trades: usize;      // 盈利笔数
    pub loss_trades: usize;            // 亏损笔数
    pub win_rate: f64;                 // 成功率（盈利笔数 / 总笔数）
    pub total_profit_loss: f64;        // 总盈亏金额
    pub average_profit_loss_rate: f64; // 平均盈亏率
    pub max_profit: f64;               // 最大盈利
    pub max_loss: f64;                 // 最大亏损
    pub average_holding_days: f64;     // 平均持有天数
}
```

**ClosedTradesSummary** - 完整总览
```rust
pub struct ClosedTradesSummary {
    pub trades: Vec<ClosedTrade>;           // 已平仓交易列表（按卖出时间倒序）
    pub statistics: ClosedTradesStatistics; // 总统计
}
```

### 2. 新增服务层 (`src-tauri/src/db/closed_trade_service.rs`)

**ClosedTradeService** - 已平仓交易统计服务

核心方法：
```rust
pub fn get_closed_trades_summary(conn: &Connection) -> Result<ClosedTradesSummary>
```

**功能：**
1. 查询所有 `status = 'CLOSE'` 的记录
2. 按 `sell_date` 倒序排列
3. 转换为 ClosedTrade 对象
4. 计算总统计数据

**统计算法：**
- 成功率 = 盈利笔数 / 总笔数
- 总盈亏 = 所有交易的盈亏之和
- 平均盈亏率 = 所有交易盈亏率的平均值
- 最大盈利 = 所有交易中的最大值
- 最大亏损 = 所有交易中的最小值
- 平均持有天数 = 所有交易持有天数的平均值

### 3. Tauri 命令 (`src-tauri/src/commands/position.rs`)

新增命令：
```rust
#[tauri::command]
pub async fn get_closed_trades_summary() -> Result<ClosedTradesSummary>
```

**注册在 main.rs 中：**
```rust
commands::position::get_closed_trades_summary,
```

### 4. 依赖更新 (`src-tauri/Cargo.toml`)

新增：
```toml
chrono = { version = "0.4", features = ["serde"] }
```

用于计算持有天数。

### 5. 数据库查询更新 (`src-tauri/src/db/position_repo.rs`)

- 新增 `map_row_to_position()` 辅助方法，统一处理所有字段的映射
- 更新所有 SELECT 查询，包含新增的三个字段

---

## 前端实现

### 1. 类型定义 (`src/lib/types.ts`)

新增三个接口：

```typescript
interface ClosedTrade {
  id: string;
  code: string;
  name: string;
  buy_date: string;
  buy_price: number;
  sell_date: string;
  sell_price: number;
  quantity: number;
  profit_loss: number;
  profit_loss_rate: number;
  portfolio: string;
  holding_days: number;
}

interface ClosedTradesStatistics {
  total_trades: number;
  profitable_trades: number;
  loss_trades: number;
  win_rate: number;
  total_profit_loss: number;
  average_profit_loss_rate: number;
  max_profit: number;
  max_loss: number;
  average_holding_days: number;
}

interface ClosedTradesSummary {
  trades: ClosedTrade[];
  statistics: ClosedTradesStatistics;
}
```

### 2. API 客户端 (`src/lib/db.ts`)

新增方法：
```typescript
async getClosedTradesSummary(): Promise<ClosedTradesSummary>
```

### 3. React 组件 (`src/components/ClosedTradesView.tsx`)

**功能：**
- 显示总统计卡片（共 8 个指标）
- 显示已平仓交易表格，按卖出时间倒序
- 支持加载状态、错误状态
- 自动色彩标记（红色=盈利，绿色=亏损）

**UI 布局：**
```
┌─ 统计卡片 ─────────────────────────────────────┐
│  总交易笔数 │ 成功率 │ 总盈亏 │ 平均盈亏率 │
│  最大盈利  │ 最大亏损 │ 平均持有天数 │
└──────────────────────────────────────────────┘

┌─ 已平仓交易列表 ──────────────────────────────┐
│ 股票 │ 买入日期 │ 买入价 │ 卖出日期 │ 卖出价 │
│ 数量 │ 盈亏金额 │ 盈亏率 │ 持有天数 │
├──────────────────────────────────────────────┤
│ 交易1 ... │
│ 交易2 ... │
│ 交易N ... │
└──────────────────────────────────────────────┘
```

### 4. 主页导航 (`src/components/HomePage.tsx`)

- 新增 "已平仓" Tab 按钮
- 在主内容区域条件渲染 `<ClosedTradesView />`

---

## 数据流

```
前端 UI
  ↓
ClosedTradesView 组件
  ↓
db.getClosedTradesSummary()
  ↓
Tauri IPC: invoke('get_closed_trades_summary')
  ↓
后端命令: commands::position::get_closed_trades_summary()
  ↓
ClosedTradeService::get_closed_trades_summary()
  ↓
PositionRepository::find_by_query(status='CLOSE')
  ↓
SQLite 数据库
  ↓
聚合和统计计算
  ↓
返回 ClosedTradesSummary
```

---

## 关键特性

### 1. 已实现
✅ 按卖出时间倒序排列
✅ 单笔交易明细展示
✅ 总统计数据计算
✅ 色彩标记（红绿显示盈亏）
✅ 持有天数自动计算
✅ 加载和错误状态处理

### 2. 暂不实现（按需扩展）
- 投资组合维度的已平仓统计
- 按日期范围过滤
- 导出功能
- 更复杂的统计分析（如夏普比率、最大回撤等）

---

## 使用示例

### 后端查询
```rust
let conn = get_db_connection()?;
let summary = ClosedTradeService::get_closed_trades_summary(&conn)?;

println!("总交易: {}", summary.statistics.total_trades);
println!("成功率: {:.2}%", summary.statistics.win_rate * 100.0);
println!("总盈亏: ¥{:.2}", summary.statistics.total_profit_loss);
```

### 前端调用
```typescript
const summary = await db.getClosedTradesSummary();
console.log(`共 ${summary.trades.length} 笔已平仓交易`);
console.log(`成功率: ${(summary.statistics.win_rate * 100).toFixed(2)}%`);
```

---

## 测试建议

1. **新增已平仓交易数据：**
   - 在应用中购买股票（创建 POSITION 记录）
   - 卖出股票（通过 close_position 或 reduce_position 创建 CLOSE 记录）

2. **验证统计：**
   - 打开 "已平仓" Tab
   - 验证交易列表是否按卖出日期倒序
   - 验证总统计数字是否正确

3. **边界情况：**
   - 无已平仓交易时的显示
   - 单笔交易的显示
   - 大量交易的性能

---

## 扩展方向

### 近期可考虑的功能
1. **按时间范围过滤** - 筛选特定日期范围的已平仓交易
2. **按股票代码过滤** - 查看特定股票的历史交易
3. **按投资组合过滤** - 查看特定投资组合的已平仓交易
4. **导出功能** - 导出已平仓交易为 CSV/Excel
5. **统计图表** - 盈亏分布、持有期分布等可视化

### 高级功能
1. **胜率分析** - 按股票、按时间段分析成功率
2. **资金回流分析** - 追踪已平仓交易的资金流向
3. **交易笔记** - 为已平仓交易添加备注和复盘
4. **策略回测** - 基于历史交易验证投资策略

---

## 文件清单

### 新增文件
- `src-tauri/src/db/closed_trade_service.rs` - 已平仓交易服务
- `src/components/ClosedTradesView.tsx` - 已平仓交易 UI 组件

### 修改文件
- `src-tauri/src/models/position.rs` - 新增数据模型和计算方法
- `src-tauri/src/db/position_repo.rs` - 更新数据库查询
- `src-tauri/src/db/mod.rs` - 导出新服务
- `src-tauri/src/commands/position.rs` - 新增 Tauri 命令
- `src-tauri/src/main.rs` - 注册新命令
- `src-tauri/Cargo.toml` - 新增 chrono 依赖
- `src/lib/types.ts` - 新增 TypeScript 类型
- `src/lib/db.ts` - 新增 API 方法
- `src/components/HomePage.tsx` - 新增 Tab 和导航

---

## 编译和测试

### 后端编译
```bash
cd src-tauri
cargo check  # 检查编译
cargo build  # 完整构建
```

### 启动应用
```bash
npm run dev  # 启动开发模式（前后端）
```

### 访问功能
1. 启动应用后，在左侧导航栏点击 "已平仓"
2. 系统会加载所有已平仓交易
3. 顶部显示总统计，下方显示交易列表

---

## 注意事项

1. **数据完整性：** 已平仓交易必须有 `sell_price` 和 `sell_date`，否则统计会出错
2. **时间格式：** 日期必须为 `YYYY-MM-DD` 格式
3. **浮点精度：** 所有货币值使用 f64，显示时适当格式化
4. **性能考虑：** 大量交易时，考虑分页显示

---

## 后续计划

本模块实现了基础的已平仓交易统计功能。根据用户反馈，可继续完善：
- 用户界面优化
- 更多统计维度
- 数据导出和分析
- 与持仓管理的联动
