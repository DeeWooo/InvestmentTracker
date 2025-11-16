# 计算规则文档

## 文档目的

本文档详细说明了 Investment Tracker 中所有财务计算的规则和公式，确保计算结果的准确性和一致性。

## 目录

1. [价格数据源](#1-价格数据源)
2. [成本计算](#2-成本计算)
3. [盈亏计算](#3-盈亏计算)
4. [统计指标计算](#4-统计指标计算)
5. [复合交易处理](#5-复合交易处理)
6. [费用处理](#6-费用处理)

---

## 1. 价格数据源

### 1.1 实时价格获取

**数据源**: 腾讯财经 API

**API 地址**: `http://qt.gtimg.cn/q={stock_codes}`

**请求格式**:
- 沪市股票: `sh600519` (600519 → sh600519)
- 深市股票: `sz000001` (000001 → sz000001)

**响应格式**:
```
v_sh600519="51~贵州茅台~600519~1850.00~1845.00~1850.50~350000~175000~175000~..."
```

**字段说明** (用索引0-50区分):
- [0]: 未知标识 (通常为51)
- [1]: 股票名称
- [2]: 股票代码
- [3]: 当前价格
- [4]: 昨日收盘价
- [5]: 开盘价
- [6-8]: 成交量相关数据
- [更多字段]: 其他行情数据

**当前实现位置**: `src-tauri/src/db/quote_service.rs`

**关键方法**:
- `fetch_real_quotes(codes: &[String])` - 批量获取实时价格
- `fetch_single_quote(code: &str)` - 获取单个股票价格
- `parse_quote_response(response: String, code: &str)` - 解析 API 响应

### 1.2 模拟数据 (Mock Data)

**使用场景**:
- 开发环境测试
- 实时价格获取失败时的后备方案

**实现位置**: `src-tauri/src/db/quote_service.rs::mock_quotes()`

**模拟逻辑**:
```rust
// 为每个股票代码生成随机价格 (800-2000 之间)
let price = 800.0 + (rand::random::<f64>() * 1200.0);
```

**已知问题**:
- ⚠️ 模拟数据会影响计算准确性
- ⚠️ 当前在前端有回退到模拟数据的逻辑 (见 `PortfolioProfitLossView.tsx:41-44`)

**v0.1.3 改进计划**:
- [x] ✅ 已完成：移除或最小化模拟数据的使用 (详见 [v0.1.3-realtime-price-priority.md](./v0.1.3-realtime-price-priority.md))

---

## 2. 成本计算

### 2.1 单笔买入成本

**公式**:
```
总成本 = 买入价格 × 数量
```

**代码实现**: `src-tauri/src/models/position.rs::Position`

```rust
pub struct Position {
    buy_price: f64,    // 买入价格
    quantity: i32,     // 数量
    // ...
}

// 成本 = buy_price * quantity
```

### 2.2 多笔买入的平均成本 (加权平均法)

**适用场景**: 同一股票多次买入

**公式**:
```
加权平均成本 = Σ(买入价格i × 数量i) / Σ(数量i)
```

**示例**:
```
第1笔: 600519 @ ¥1680.50 × 100股 = ¥168,050
第2笔: 600519 @ ¥1700.00 × 50股  = ¥85,000
----------------------------------------
总成本: ¥253,050
总数量: 150股
平均成本 = ¥253,050 / 150 = ¥1686.67
```

**代码实现**: `src-tauri/src/db/position_repo.rs::get_position_stats_by_code()`

```rust
pub fn get_position_stats_by_code(conn: &Connection, code: &str) -> Result<PositionStats> {
    let mut stmt = conn.prepare(
        "SELECT
            COUNT(*) as record_count,
            SUM(quantity) as total_quantity,
            SUM(quantity * buy_price) as total_cost
         FROM positions
         WHERE code = ? AND status = 'POSITION'"
    )?;

    // ...

    let avg_cost_price = if stats.total_quantity > 0 {
        stats.total_cost / stats.total_quantity as f64
    } else {
        0.0
    };
}
```

**注意事项**:
- ✅ 使用加权平均法 (非 FIFO 先进先出)
- ✅ 仅计算状态为 'POSITION' 的持仓
- ✅ 避免除以零错误

---

## 3. 盈亏计算

### 3.1 单个股票盈亏

**公式**:
```
当前市值 = 当前价格 × 持仓数量
盈亏金额 = 当前市值 - 总成本
盈亏率 = (盈亏金额 / 总成本) × 100%
```

**代码实现**: `src-tauri/src/db/position_repo.rs::calculate_pnl()`

```rust
pub fn calculate_pnl(&self, current_price: f64) -> PnL {
    let current_value = self.total_quantity as f64 * current_price;
    let pnl = current_value - self.total_cost;
    let pnl_percentage = if self.total_cost > 0.0 {
        pnl / self.total_cost * 100.0
    } else {
        0.0
    };

    PnL {
        current_value,
        pnl,
        pnl_percentage,
    }
}
```

**示例**:
```
持仓: 600519 贵州茅台
平均成本: ¥1686.67
持仓数量: 150股
当前价格: ¥1850.00

当前市值 = ¥1850.00 × 150 = ¥277,500
盈亏金额 = ¥277,500 - ¥253,050 = ¥24,450
盈亏率 = (¥24,450 / ¥253,050) × 100% = 9.66%
```

### 3.2 已平仓交易盈亏

**适用对象**: 状态为 'CLOSE' 的交易

**公式**:
```
盈亏金额 = (卖出价格 - 买入价格) × 数量
盈亏率 = ((卖出价格 - 买入价格) / 买入价格) × 100%
```

**代码实现**: `src-tauri/src/commands/position.rs::get_closed_trades_summary()`

```rust
// SQL 查询计算平仓盈亏
SELECT
    id,
    code,
    name,
    buy_price,
    buy_date,
    sell_price,
    sell_date,
    quantity,
    (sell_price - buy_price) * quantity as profit_loss,
    (sell_price - buy_price) / buy_price as profit_loss_rate,
    julianday(sell_date) - julianday(buy_date) as holding_days
FROM positions
WHERE status = 'CLOSE'
ORDER BY sell_date DESC
```

**示例**:
```
交易: 000001 平安银行
买入价格: ¥12.50
卖出价格: ¥13.80
数量: 1000股
持有天数: 15天

盈亏金额 = (¥13.80 - ¥12.50) × 1000 = ¥1,300
盈亏率 = (¥1.30 / ¥12.50) × 100% = 10.40%
```

### 3.3 目标仓位盈亏

**目标仓位定义**: 固定金额 `FULL_POSITION = ¥50,000`

**公式**:
```
目标数量 = FULL_POSITION / 当前价格
目标盈亏金额 = (当前价格 - 平均成本) × 目标数量
目标盈亏率 = ((当前价格 - 平均成本) / 平均成本) × 100%
```

**代码实现**: `src-tauri/src/db/portfolio_service.rs::create_target_profit_loss()`

```rust
const FULL_POSITION: f64 = 50000.0;

fn create_target_profit_loss(
    code: String,
    name: String,
    avg_cost: f64,
    current_price: f64,
) -> TargetProfitLoss {
    let target_quantity = (FULL_POSITION / current_price).floor();
    let target_profit_loss = (current_price - avg_cost) * target_quantity;
    let target_profit_loss_rate = if avg_cost > 0.0 {
        (current_price - avg_cost) / avg_cost
    } else {
        0.0
    };

    TargetProfitLoss {
        code,
        name,
        avg_cost,
        current_price,
        target_quantity,
        target_profit_loss,
        target_profit_loss_rate,
    }
}
```

**示例**:
```
股票: 600519 贵州茅台
平均成本: ¥1686.67
当前价格: ¥1850.00

目标数量 = ¥50,000 / ¥1850.00 = 27股 (向下取整)
目标盈亏金额 = (¥1850.00 - ¥1686.67) × 27 = ¥4,410
目标盈亏率 = (¥163.33 / ¥1686.67) × 100% = 9.68%
```

---

## 4. 统计指标计算

### 4.1 总交易笔数

**定义**: 所有已平仓的交易记录数量

**SQL 查询**:
```sql
SELECT COUNT(*) FROM positions WHERE status = 'CLOSE'
```

### 4.2 盈利/亏损交易笔数

**定义**:
- 盈利交易: `(sell_price - buy_price) * quantity > 0`
- 亏损交易: `(sell_price - buy_price) * quantity < 0`

**SQL 查询**:
```sql
-- 盈利交易
SELECT COUNT(*) FROM positions
WHERE status = 'CLOSE'
AND (sell_price - buy_price) * quantity > 0

-- 亏损交易
SELECT COUNT(*) FROM positions
WHERE status = 'CLOSE'
AND (sell_price - buy_price) * quantity < 0
```

### 4.3 成功率 (Win Rate)

**公式**:
```
成功率 = (盈利交易笔数 / 总交易笔数) × 100%
```

**代码实现**: `src-tauri/src/commands/position.rs`

```rust
let win_rate = if total_trades > 0 {
    profitable_trades as f64 / total_trades as f64
} else {
    0.0
};
```

**示例**:
```
总交易: 20笔
盈利: 13笔
亏损: 7笔

成功率 = (13 / 20) × 100% = 65%
```

### 4.4 总盈亏

**公式**:
```
总盈亏 = Σ((卖出价格i - 买入价格i) × 数量i)
```

**SQL 查询**:
```sql
SELECT SUM((sell_price - buy_price) * quantity) as total_profit_loss
FROM positions
WHERE status = 'CLOSE'
```

### 4.5 平均盈亏率

**公式**:
```
平均盈亏率 = Σ((卖出价格i - 买入价格i) / 买入价格i) / 总交易笔数
```

**SQL 查询**:
```sql
SELECT AVG((sell_price - buy_price) / buy_price) as avg_profit_loss_rate
FROM positions
WHERE status = 'CLOSE'
```

**注意事项**:
- ✅ 使用算术平均 (非加权平均)
- ✅ 每笔交易的盈亏率权重相同，不考虑交易金额大小

### 4.6 最大盈利 / 最大亏损

**公式**:
```
最大盈利 = MAX((卖出价格 - 买入价格) × 数量) where 盈亏 > 0
最大亏损 = MIN((卖出价格 - 买入价格) × 数量) where 盈亏 < 0
```

**SQL 查询**:
```sql
-- 最大盈利
SELECT MAX((sell_price - buy_price) * quantity) as max_profit
FROM positions
WHERE status = 'CLOSE'

-- 最大亏损
SELECT MIN((sell_price - buy_price) * quantity) as max_loss
FROM positions
WHERE status = 'CLOSE'
```

**前端显示**:
- 最大亏损取绝对值显示: `Math.abs(Math.min(0, stats.max_loss))`

### 4.7 平均持有天数

**公式**:
```
持有天数 = 卖出日期 - 买入日期 (自然日)
平均持有天数 = Σ(持有天数i) / 总交易笔数
```

**SQL 查询**:
```sql
SELECT AVG(julianday(sell_date) - julianday(buy_date)) as avg_holding_days
FROM positions
WHERE status = 'CLOSE'
```

**代码实现**: 使用 SQLite `julianday()` 函数计算日期差

**示例**:
```
交易1: 2025-01-01 买入, 2025-01-15 卖出 → 14天
交易2: 2025-01-05 买入, 2025-02-10 卖出 → 36天
交易3: 2025-01-10 买入, 2025-01-25 卖出 → 15天

平均持有天数 = (14 + 36 + 15) / 3 = 21.67天
前端显示: Math.round(21.67) = 22天
```

### 4.8 统计卡片完整列表

**实现位置**: `src/components/ClosedTradesView.tsx::StatisticsCards`

1. **总交易笔数** - `stats.total_trades`
2. **成功率** - `(stats.win_rate * 100).toFixed(1)%` + 盈亏笔数明细
3. **总盈亏** - `stats.total_profit_loss.toFixed(2)`
4. **平均盈亏率** - `(stats.average_profit_loss_rate * 100).toFixed(2)%`
5. **最大盈利** - `Math.max(0, stats.max_profit).toFixed(2)`
6. **最大亏损** - `Math.abs(Math.min(0, stats.max_loss)).toFixed(2)`
7. **平均持有天数** - `Math.round(stats.average_holding_days)`

---

## 5. 复合交易处理

### 5.1 复合交易定义

**场景**: 同一股票多次买入、多次卖出、部分平仓

**当前实现方式**: 每笔交易独立记录

**数据结构**:
```rust
pub struct Position {
    id: String,           // 唯一标识
    code: String,         // 股票代码
    buy_price: f64,       // 买入价格
    buy_date: String,     // 买入日期
    quantity: i32,        // 数量
    status: String,       // POSITION / CLOSE
    sell_price: Option<f64>,   // 卖出价格 (可选)
    sell_date: Option<String>, // 卖出日期 (可选)
    parent_id: Option<String>, // 父记录ID (用于拆分)
}
```

### 5.2 持仓聚合逻辑

**实现位置**: `src-tauri/src/db/portfolio_service.rs::aggregate_positions()`

**聚合方式**:
```rust
// 按股票代码分组
let mut groups: HashMap<String, Vec<Position>> = HashMap::new();

for position in positions {
    groups
        .entry(position.code.clone())
        .or_insert_with(Vec::new)
        .push(position);
}

// 对每组计算加权平均成本
for (code, positions_in_group) in groups {
    let total_quantity: i32 = positions_in_group.iter().map(|p| p.quantity).sum();
    let total_cost: f64 = positions_in_group.iter()
        .map(|p| p.quantity as f64 * p.buy_price)
        .sum();
    let avg_cost = total_cost / total_quantity as f64;
}
```

**示例**:
```
持仓记录:
1. 600519 @ ¥1680.50 × 100股 (2025-01-01)
2. 600519 @ ¥1700.00 × 50股  (2025-01-03)
3. 000001 @ ¥12.50 × 1000股 (2025-01-02)

聚合后:
- 600519: 150股, 平均成本 ¥1686.67
- 000001: 1000股, 平均成本 ¥12.50
```

### 5.3 部分平仓处理

**当前状态**: ⚠️ 未完全实现

**预期逻辑** (待实现):
1. 用户卖出部分持仓 (如: 卖出150股中的50股)
2. 系统创建新的 CLOSE 记录 (50股)
3. 原记录更新数量 (100股) 或拆分为多条记录
4. 记录父子关系 (使用 `parent_id` 字段)

**v0.1.3 改进计划**:
- [ ] 实现部分平仓逻辑
- [ ] 支持 FIFO 或指定批次平仓
- [ ] 记录拆分历史

---

## 6. 费用处理

### 6.1 当前状态

**交易费用**: ⚠️ 当前未实现

**费用类型**:
- 佣金 (Commission): 通常为成交金额的万分之几
- 印花税 (Stamp Duty): 卖出时收取 (千分之一)
- 过户费 (Transfer Fee): 沪市股票收取

### 6.2 费用计算公式 (待实现)

**买入费用**:
```
佣金 = MAX(买入金额 × 佣金率, 最低佣金)
过户费 = 数量 × 过户费单价 (仅沪市)
买入总成本 = 买入金额 + 佣金 + 过户费
```

**卖出费用**:
```
佣金 = MAX(卖出金额 × 佣金率, 最低佣金)
印花税 = 卖出金额 × 0.001
过户费 = 数量 × 过户费单价 (仅沪市)
卖出净收入 = 卖出金额 - 佣金 - 印花税 - 过户费
```

**盈亏计算 (含费用)**:
```
实际盈亏 = 卖出净收入 - 买入总成本
```

### 6.3 后续改进计划 (v0.1.4+)

- [ ] 添加费用配置表 (commission_rate, min_commission, stamp_duty_rate)
- [ ] 修改 Position 模型，增加费用字段
- [ ] 更新盈亏计算逻辑，包含费用
- [ ] 前端显示费用明细

---

## 7. 数据一致性保证

### 7.1 数据验证

**实现位置**: `src-tauri/src/models/position.rs::validate()`

```rust
pub fn validate(&self) -> Result<()> {
    if self.code.is_empty() {
        return Err(validation_error!("股票代码不能为空"));
    }
    if self.buy_price <= 0.0 {
        return Err(validation_error!("买入价格必须大于0"));
    }
    if self.quantity <= 0 {
        return Err(validation_error!("数量必须大于0"));
    }
    // ...
    Ok(())
}
```

### 7.2 计算精度

**价格精度**: 保留2位小数 (`.toFixed(2)`)

**百分比精度**:
- 盈亏率: 保留2位小数
- 成功率: 保留1位小数

**数量**: 整数 (i32)

### 7.3 边界条件处理

**除以零保护**:
```rust
let avg_cost_price = if stats.total_quantity > 0 {
    stats.total_cost / stats.total_quantity as f64
} else {
    0.0
};
```

**空数据处理**:
```typescript
if (!summary || summary.trades.length === 0) {
    return <EmptyState />;
}
```

---

## 8. 已知问题和改进计划

### 8.1 v0.1.2 已知问题

1. ⚠️ **价格数据依赖模拟数据**: 实时价格获取失败时回退到随机数据
2. ⚠️ **未实现交易费用**: 盈亏计算不包含佣金、印花税等
3. ⚠️ **部分平仓未完整实现**: 无法精确记录拆分交易
4. ⚠️ **缺少价格缓存**: 每次都重新请求实时价格

### 8.2 v0.1.3 改进完成

**已实现: 计算准确性**
- [x] ✅ 移除或最小化模拟数据使用 (详见 [v0.1.3-realtime-price-priority.md](./v0.1.3-realtime-price-priority.md))

**后续版本规划: 费用支持 (v0.1.4+)**
- [ ] 实现交易费用计算
- [ ] 更新盈亏公式包含费用
- [ ] 前端显示费用明细

**后续版本规划: 复合交易 (v0.1.4+)**
- [ ] 完善部分平仓逻辑
- [ ] 支持 FIFO 平仓方式
- [ ] 记录交易拆分历史

---

## 9. 测试用例

### 9.1 单元测试覆盖

**当前测试**: `src-tauri/src/db/position_repo.rs::tests`

**测试场景**:
- 创建持仓记录
- 查询持仓记录
- 聚合投资组合
- 计算加权平均成本

### 9.2 待补充的测试用例

**盈亏计算准确性**:
```rust
#[test]
fn test_profit_loss_calculation() {
    // 测试单笔交易盈亏
    // 测试多笔交易加权平均成本
    // 测试边界条件 (价格为0, 数量为0)
}
```

**统计指标准确性**:
```rust
#[test]
fn test_statistics_calculation() {
    // 测试成功率计算
    // 测试平均盈亏率计算
    // 测试最大盈利/亏损计算
}
```

---

## 10. 参考资料

**相关代码文件**:
- [src-tauri/src/db/quote_service.rs](../src-tauri/src/db/quote_service.rs) - 价格获取
- [src-tauri/src/db/position_repo.rs](../src-tauri/src/db/position_repo.rs) - 持仓数据访问
- [src-tauri/src/db/portfolio_service.rs](../src-tauri/src/db/portfolio_service.rs) - 投资组合聚合
- [src-tauri/src/commands/position.rs](../src-tauri/src/commands/position.rs) - 已平仓统计
- [src/components/ClosedTradesView.tsx](../src/components/ClosedTradesView.tsx) - 前端统计展示

**外部API**:
- 腾讯财经行情接口: http://qt.gtimg.cn/q={codes}

---

**文档版本**: v1.0
**最后更新**: 2025-11-14
**维护者**: Investment Tracker Team
