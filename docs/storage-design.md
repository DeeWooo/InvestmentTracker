# 投资记录工具 - 本地存储方案设计

> 本方案基于 `position-minitor-java` 的成熟设计，将 Spring Boot Web 版本适配为 Tauri PC 桌面版本

## 一、参考项目分析

### 1.1 Java Web 版本架构
- **技术栈**: Spring Boot + Thymeleaf + MySQL
- **核心设计**:
  - 每笔买入都是独立的数据库记录
  - 平仓不记录卖出价格，只改变记录状态
  - 实时价格通过定时任务从外部 API 获取，存储在全局 Map
  - 持仓、盈亏等都通过聚合计算得出

### 1.2 当前 PC 版本的问题

```sql
-- 现有设计（有问题）
CREATE TABLE positions (
    code TEXT PRIMARY KEY,           -- ❌ 主键是 code，会导致覆盖！
    quantity INTEGER NOT NULL,
    buy_price REAL NOT NULL,         -- ❌ 多次买入时被覆盖
    buy_date TEXT NOT NULL,          -- ❌ 日期也被覆盖
    portfolio TEXT,
    ...
);
```

**问题：** 用 `INSERT OR REPLACE` 时，同一个 code 的第二次买入会**覆盖**第一次的记录

---

## 二、改进方案：参考 Java 版本的设计

### 2.1 设计理念

**核心思想**: 借鉴 Java 版本的成熟设计

- ✅ 每笔买入都是独立的一条记录（用自增 ID 或 UUID 作主键）
- ✅ 平仓时改变记录状态（`status`），而不是记录卖出
- ✅ 实时价格不存数据库，由前端从 API 获取
- ✅ 持仓、成本、盈亏都通过聚合查询计算

### 2.2 改进的 positions 表结构（完全对齐 Java 版本）

```sql
-- 改进后的 positions 表（完全对齐 Java 版本的字段）
CREATE TABLE positions (
    id TEXT PRIMARY KEY,                    -- 记录ID (UUID) ⭐
    code TEXT NOT NULL,                     -- 股票代码
    name TEXT NOT NULL,                     -- 股票名称
    buy_price REAL NOT NULL,                -- 买入价格
    buy_date TEXT NOT NULL,                 -- 买入日期 (YYYY-MM-DD)
    quantity INTEGER NOT NULL,              -- 买入数量
    status TEXT NOT NULL DEFAULT 'POSITION', -- 状态: 'POSITION' | 'CLOSE' ⭐
    portfolio TEXT                          -- 所属组合
);

-- 索引优化查询性能
CREATE INDEX idx_code ON positions(code);
CREATE INDEX idx_status ON positions(status);
```

**字段说明（完全对应 Java 版本）：**

| Java 字段 | SQLite 字段 | 类型 | 说明 |
|----------|-------------|------|------|
| `id` | `id` | TEXT | UUID 主键（Java 用 Long 自增） |
| `code` | `code` | TEXT | 股票代码 |
| `name` | `name` | TEXT | 股票名称 |
| `buyInPrice` | `buy_price` | REAL | 买入价格 |
| `buyInDate` | `buy_date` | TEXT | 买入日期 |
| `number` | `quantity` | INTEGER | 数量 |
| `status` | `status` | TEXT | 状态（POSITION/CLOSE） |
| `portfolio` | `portfolio` | TEXT | 投资组合 |

**删除的冗余字段：**
- ❌ `symbol` - Java 版本没有
- ❌ `created_at` - Java 版本没有
- ❌ `note` - Java 版本没有

### 2.3 数据流设计

```
【买入流程】
用户输入买入信息
    ↓
[前端表单验证]
    ↓
调用 Tauri Command: save_position()
    ↓
[Rust 后端]
├─ 验证数据
├─ 生成唯一 UUID
├─ INSERT 到 positions 表（status='POSITION'）
└─ 返回成功/失败
    ↓
[前端刷新] 显示最新持仓

【平仓流程】
用户点击"平仓"按钮
    ↓
调用 Tauri Command: close_position(id)
    ↓
[Rust 后端]
├─ 查询对应记录
├─ 将 status 改为 'CLOSE'
└─ 保存
    ↓
[前端刷新] 隐藏已平仓的记录
```

---

## 三、核心功能实现

### 3.1 计算逻辑（参考 Java 版本）

#### 当前持仓（按 code 分组）
```sql
-- 查询所有持仓中的 code
SELECT DISTINCT code
FROM positions
WHERE status = 'POSITION'
ORDER BY code;
```

#### 某个 code 的所有买入记录
```sql
-- 获取某个股票的所有买入记录
SELECT *
FROM positions
WHERE code = ? AND status = 'POSITION'
ORDER BY buy_date DESC;
```

#### 计算总持仓数量
```sql
SELECT
    code,
    SUM(quantity) as total_quantity
FROM positions
WHERE code = ? AND status = 'POSITION'
GROUP BY code;
```

#### 计算平均成本价
```sql
-- 加权平均成本价 = 总买入金额 / 总买入数量
SELECT
    code,
    SUM(quantity * buy_price) / SUM(quantity) as avg_cost_price,
    SUM(quantity * buy_price) as total_cost
FROM positions
WHERE code = ? AND status = 'POSITION'
GROUP BY code;
```

#### 实时盈亏计算（前端负责）
```typescript
// 后端返回持仓数据后，前端负责计算盈亏
const realPrice = await fetchRealPrice(code);  // 从 API 获取实时价格
const currentValue = totalQuantity * realPrice;
const pnl = currentValue - totalCost;
const pnlPercentage = (pnl / totalCost) * 100;
```

### 3.2 关键 API 设计（参考 Java 版本）

```rust
// 1. 保存持仓记录（每笔买入）
#[tauri::command]
async fn save_position(position: Position) -> Result<Position, String>

// 2. 获取所有持仓中的 code
#[tauri::command]
async fn get_codes_in_position() -> Result<Vec<String>, String>

// 3. 获取某个 code 的所有买入记录
#[tauri::command]
async fn get_position_records(code: String) -> Result<Vec<Position>, String>

// 4. 平仓（改变状态）
#[tauri::command]
async fn close_position(id: String) -> Result<(), String>

// 5. 删除记录
#[tauri::command]
async fn delete_position(id: String) -> Result<(), String>
```

---

## 四、迁移方案

### 4.1 数据迁移脚本

```rust
// 升级旧 positions 表结构
#[tauri::command]
async fn migrate_old_positions_schema() -> Result<(), String> {
    let conn = get_db()?;

    // 1. 备份旧表
    conn.execute("ALTER TABLE positions RENAME TO positions_old", [])
        .map_err(|e| e.to_string())?;

    // 2. 创建新表结构（完全对齐 Java 版本）
    conn.execute(
        "CREATE TABLE positions (
            id TEXT PRIMARY KEY,
            code TEXT NOT NULL,
            name TEXT NOT NULL,
            buy_price REAL NOT NULL,
            buy_date TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'POSITION',
            portfolio TEXT
        )",
        [],
    )
    .map_err(|e| e.to_string())?;

    // 3. 迁移旧数据
    let mut stmt = conn
        .prepare("SELECT code, name, quantity, buy_price, buy_date, portfolio FROM positions_old")
        .map_err(|e| e.to_string())?;

    let old_records = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,  // code
                row.get::<_, String>(1)?,  // name
                row.get::<_, i32>(2)?,     // quantity
                row.get::<_, f64>(3)?,     // buy_price
                row.get::<_, String>(4)?,  // buy_date
                row.get::<_, String>(5)?,  // portfolio
            ))
        })
        .map_err(|e| e.to_string())?;

    for rec_result in old_records {
        let (code, name, quantity, buy_price, buy_date, portfolio) =
            rec_result.map_err(|e| e.to_string())?;

        let id = uuid::Uuid::new_v4().to_string();

        conn.execute(
            "INSERT INTO positions (id, code, name, buy_price, buy_date, quantity, status, portfolio)
             VALUES (?, ?, ?, ?, ?, ?, 'POSITION', ?)",
            rusqlite::params![
                id, code, name, buy_price, buy_date, quantity, portfolio
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    // 4. 创建索引
    conn.execute("CREATE INDEX idx_code ON positions(code)", [])
        .map_err(|e| e.to_string())?;
    conn.execute("CREATE INDEX idx_status ON positions(status)", [])
        .map_err(|e| e.to_string())?;

    Ok(())
}
```

### 4.2 迁移步骤

1. 备份旧 `positions` 表（重命名为 `positions_old`）
2. 创建新结构的 `positions` 表（参考 Java 版本）
3. 从旧表读取数据，为每条记录生成唯一 UUID
4. 所有旧数据的 `status` 设为 'POSITION'（持仓中）
5. 创建必要的索引
6. 验证数据一致性后，可删除 `positions_old` 备份

---

## 五、优势与权衡

### 5.1 优势 ✅

- **简单直接** - 只有一张表，没有复杂的关系，易于理解和维护
- **完整的交易历史** - 记录所有买入和卖出，支持审计
- **准确的成本计算** - 自动计算加权平均成本价，支持分批买卖
- **灵活扩展** - 想加新字段直接加，想加新类型直接加
- **性能足够** - SQLite 对个人级别数据（< 1000条）完全无压力

### 5.2 权衡 ⚖️

- **需要重构现有代码** - 从 `positions` 迁移到 `transactions`
- **查询时需要聚合计算** - 但这对小数据量完全不是问题
- **前端需要获取实时价格** - current_price 由前端负责从外部 API 获取

---

## 六、实施计划

### 阶段 1：数据库重构（1-2天）
- [ ] 创建新的 `transactions` 表结构
- [ ] 实现迁移脚本（从 positions 迁移）
- [ ] 备份旧数据

### 阶段 2：后端 API 实现（2天）
- [ ] 实现 `save_transaction` 命令
- [ ] 实现 `get_transactions` 命令
- [ ] 实现 `get_current_positions` 聚合查询
- [ ] 实现 `delete_transaction` 命令
- [ ] 错误处理和日志

### 阶段 3：前端适配（2-3天）
- [ ] 更新 TypeScript 类型定义
- [ ] 修改买入表单（改为创建 BUY 交易）
- [ ] 新增卖出表单（创建 SELL 交易）
- [ ] 交易历史列表页面
- [ ] 更新持仓显示（从聚合数据读取）

### 阶段 4：测试（1天）
- [ ] 功能测试
- [ ] 数据迁移验证
- [ ] 边界情况测试

**总计：6-7天**

---

## 七、示例数据（完全对齐 Java 版本）

```json
// positions 表记录示例（完全对应 PositionEntity）
[
  {
    "id": "uuid_001",
    "code": "600519",
    "name": "贵州茅台",
    "buy_price": 1680.50,
    "buy_date": "2025-01-01",
    "quantity": 100,
    "status": "POSITION",
    "portfolio": "稳健型"
  },
  {
    "id": "uuid_002",
    "code": "600519",
    "name": "贵州茅台",
    "buy_price": 1720.00,
    "buy_date": "2025-02-01",
    "quantity": 100,
    "status": "POSITION",
    "portfolio": "稳健型"
  },
  {
    "id": "uuid_003",
    "code": "600519",
    "name": "贵州茅台",
    "buy_price": 1750.00,
    "buy_date": "2025-03-01",
    "quantity": 100,
    "status": "CLOSE",           // 已平仓，只改状态
    "portfolio": "稳健型"
  }
]

// 后端聚合计算的持仓汇总（对应 PortfolioService 的逻辑）
[
  {
    "code": "600519",
    "name": "贵州茅台",
    "portfolio": "稳健型",
    "totalQuantity": 200,             // 100 + 100（只统计 status=POSITION）
    "avgCostPrice": 1700.25,          // (100*1680.5 + 100*1720) / 200
    "totalCost": 340050.00,           // 200 * 1700.25
    "records": [                      // 所有买入记录
      { "id": "uuid_001", "quantity": 100, "buy_price": 1680.50, "buy_date": "2025-01-01" },
      { "id": "uuid_002", "quantity": 100, "buy_price": 1720.00, "buy_date": "2025-02-01" }
    ],
    // 以下字段由前端计算（实时价格从 API 获取）
    "currentPrice": 1850.00,
    "currentValue": 370000.00,
    "pnl": 29950.00,
    "pnlPercentage": 8.81
  }
]
```

---

## 八、总结

**设计来源：** 基于 `position-minitor-java` 的成熟设计

**核心特点：**
- ✅ 主键为 `id`（UUID），每条记录都唯一，不会覆盖
- ✅ 平仓时改变 `status` 状态，不记录卖出价格
- ✅ 每笔买入都是独立记录，支持完整的交易历史
- ✅ 持仓、成本、盈亏都通过聚合查询计算得出
- ✅ 实时价格不存数据库，由前端从 API 获取

**与 Java 版本的区别：**
- 用 TEXT UUID 代替自增 BIGINT ID
- 用 SQL 的 GROUP BY + SUM 代替 Java 的 Stream API
- 表结构精简，去掉了计算字段

**好处：**
- ✅ 代码改动最小（直接升级现有 positions 表）
- ✅ 完整的买入历史记录
- ✅ 准确的成本计算（加权平均）
- ✅ 平仓机制简单明确（只改状态）
- ✅ 符合金融系统的标准做法
