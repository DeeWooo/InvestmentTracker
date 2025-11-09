# InvestmentTracker - 与 Java 版本的差距分析

> 对比当前 Tauri 版本与 position-minitor-java 版本的功能、架构差异

---

## 一、数据模型对比

### Java 版本 - PositionEntity
```java
@Entity
@Table(name = "position")
public class PositionEntity {
    private Long id;                    // 自增主键
    private String code;                // 股票代码
    private String name;                // 股票名称
    private Date buyInDate;             // 买入日期
    private BigDecimal buyInPrice;      // 买入价格
    private PositionStatus status;      // 状态：POSITION / CLOSE
    private Integer number;             // 数量
    private Portfolio portfolio;        // 投资组合枚举
}
```
**特点：**
- ✅ 8个字段，精简设计
- ✅ 使用枚举类型（PositionStatus, Portfolio）
- ✅ 自增主键，每笔买入独立记录
- ✅ 不存储计算字段

---

### 当前 Tauri 版本 - Position
```sql
CREATE TABLE positions (
    code TEXT PRIMARY KEY,          ❌ 错误！主键应该是 id
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    buy_price REAL NOT NULL,
    buy_date TEXT NOT NULL,
    portfolio TEXT,
    symbol TEXT,                    ❌ Java 版本没有
    current_price REAL,             ❌ 不应该存储
    pnl REAL,                       ❌ 不应该存储
    pnl_percentage REAL,            ❌ 不应该存储
    profit10 REAL,                  ❌ Java 版本没有
    profit20 REAL                   ❌ Java 版本没有
)
```
**问题：**
- ❌ 主键是 `code`，导致同一股票多次买入会覆盖
- ❌ 存储了计算字段（current_price, pnl 等）
- ❌ 缺少 `status` 字段（平仓标记）
- ❌ 多了 Java 版本不需要的字段

---

## 二、核心功能对比

### 2.1 持仓管理

| 功能 | Java 版本 | Tauri 版本 | 差距 |
|------|----------|-----------|------|
| **保存持仓记录** | ✅ `saveRecord()` | ✅ `save_position()` | 🟡 设计不同 |
| **查询所有持仓** | ✅ `show()` 过滤 CLOSE | ✅ `get_positions()` | ❌ 无过滤 |
| **查询单个代码** | ✅ `showOne(code)` | ❌ 缺失 | ❌ 需要实现 |
| **获取持仓代码列表** | ✅ `getCodesInPosition()` | ❌ 缺失 | ❌ 需要实现 |
| **平仓** | ✅ `closePosition(id)` | ❌ 缺失 | ❌ 需要实现 |

**Java 版本核心方法：**
```java
// 1. 保存持仓记录（每笔买入）
public void saveRecord(PositionEntity positionEntity) {
    positionRepository.save(positionEntity);
}

// 2. 显示持仓（过滤已平仓）
public List<PositionProfitLoss> show() {
    return positionRepository.findAll().stream()
        .filter(entity -> PositionStatus.CLOSE != entity.getStatus())
        .map(item -> convertEntity2ProfitLoss(item))
        .collect(Collectors.toList());
}

// 3. 获取持仓中的所有代码（去重）
public List<String> getCodesInPosition() {
    return positionRepository.findAllByStatus(PositionStatus.POSITION).stream()
        .map(PositionEntity::getCode)
        .distinct()
        .collect(Collectors.toList());
}

// 4. 平仓（只改状态，不删除记录）
public void closePosition(Long id) {
    PositionEntity entity = positionRepository.findTopById(id);
    entity.setStatus(PositionStatus.CLOSE);
    positionRepository.save(entity);
}
```

**当前 Tauri 版本的问题：**
```rust
// ❌ 使用 INSERT OR REPLACE，会覆盖同一 code 的记录
async fn save_position(position: Position) -> Result<Position, String> {
    conn.execute("INSERT OR REPLACE INTO positions (...)", ...)?;
    Ok(position)
}

// ❌ 没有过滤 status，返回所有记录（包括已平仓）
async fn get_positions() -> Result<Vec<Position>, String> {
    stmt.prepare("SELECT * FROM positions")?;  // 应该加 WHERE status = 'POSITION'
    // ...
}

// ❌ 缺少以下方法：
// - get_codes_in_position()
// - get_position_records(code)
// - close_position(id)
```

---

### 2.2 投资组合管理

| 功能 | Java 版本 | Tauri 版本 | 差距 |
|------|----------|-----------|------|
| **组合汇总** | ✅ `PortfolioService.show()` | 🟡 `get_portfolio_summary()` | 🟡 功能简化 |
| **按组合分组** | ✅ `groupingBy(Portfolio)` | ✅ `GROUP BY portfolio` | ✅ 等价 |
| **按代码二级分组** | ✅ `groupingBy(Code)` | ❌ 缺失 | ❌ 需要实现 |
| **计算目标盈亏** | ✅ `TargetProfitLoss` | ❌ 缺失 | ❌ 需要实现 |
| **建议买卖点** | ✅ 计算 ±10% | ❌ 缺失 | ❌ 需要实现 |

**Java 版本的复杂计算：**
```java
public List<PortfolioProfitLoss> show() {
    // 1. 按投资组合分组
    Map<Portfolio, List<PositionEntity>> portfolioMap =
        positionEntities.stream()
            .collect(Collectors.groupingBy(PositionEntity::getPortfolio));

    // 2. 每个组合内按代码二级分组
    Map<String, List<PositionEntity>> codeMap =
        entities.stream()
            .collect(Collectors.groupingBy(PositionEntity::getCode));

    // 3. 计算每个代码的汇总
    // - 成本仓位率 = Σ(买入价 * 数量) / 满仓金额
    // - 当前仓位率 = 实时价 * 总数量 / 满仓金额
    // - 盈亏 = Σ((实时价 - 买入价) * 数量)
    // - 盈亏率 = 盈亏 / 成本

    // 4. 建议买卖点
    // - 建议买入点 = 最后买入价 * 0.9
    // - 建议卖出点 = 最后买入价 * 1.1
}
```

**当前 Tauri 版本的实现：**
```rust
// 🟡 只做了简单的组合汇总，缺少二级分组和详细计算
async fn get_portfolio_summary() -> Result<Vec<PortfolioSummary>, String> {
    let mut stmt = conn.prepare(
        "SELECT portfolio,
                SUM(quantity * buy_price) as total_cost,
                SUM(quantity * current_price) as total_value
         FROM positions
         GROUP BY portfolio"
    )?;

    // ❌ 缺少：
    // - 按代码二级分组
    // - TargetProfitLoss 计算
    // - 建议买卖点
}
```

---

### 2.3 实时价格获取

| 功能 | Java 版本 | Tauri 版本 | 差距 |
|------|----------|-----------|------|
| **实时行情服务** | ✅ `RealQuoteService` | ❌ 缺失 | ❌ 需要实现 |
| **WebSocket 推送** | ✅ `MyWebSocket` | ❌ 缺失 | ❌ 需要实现 |
| **定时任务** | ✅ `TaskScheduler` | ❌ 缺失 | ❌ 需要实现 |
| **全局价格缓存** | ✅ `Quote.realQuoteMap` | ❌ 缺失 | ❌ 需要实现 |

**Java 版本的实时价格架构：**
```java
// 1. 全局静态缓存
public class Quote {
    public static Map<String, RealQuote> realQuoteMap = new ConcurrentHashMap<>();
    public static BigDecimal FULL_POSITION = new BigDecimal(50000); // 满仓金额
}

// 2. 定时任务（每N秒更新一次）
@Component
public class TaskScheduler {
    @Scheduled(fixedDelay = 3000)
    public void updateRealPrice() {
        List<String> codes = positionService.getCodesInPosition();
        Map<String, RealQuote> quotes = realQuoteService.fetchQuotes(codes);
        Quote.realQuoteMap.putAll(quotes);
    }
}

// 3. WebSocket 推送给前端
@Component
public class MyWebSocket {
    @Scheduled(fixedDelay = 1000)
    public void pushToClients() {
        webSocketSessions.forEach(session -> {
            session.sendMessage(new TextMessage(
                JSONUtil.toJsonStr(Quote.realQuoteMap)
            ));
        });
    }
}
```

**当前 Tauri 版本：**
- ❌ 完全缺失实时价格功能
- ❌ 数据库存储了 `current_price`（不应该存）
- ❌ 没有定时更新机制
- ❌ 没有与前端的实时通信

---

## 三、架构对比

### Java 版本架构（Spring Boot）
```
Controller (HTTP)
    ↓
Service Layer
    ├── PositionService       # 持仓业务逻辑
    ├── PortfolioService      # 组合业务逻辑
    └── RealQuoteService      # 实时行情
    ↓
Repository (JPA)
    └── PositionRepository
    ↓
Database (MySQL)
    └── position 表

定时任务 (TaskScheduler)
    ↓
WebSocket (推送给前端)
```

---

### Tauri 版本架构（当前）
```
React 组件
    ↓
Custom Hooks (usePositions)
    ↓
API 层 (db.ts)
    ↓
Tauri IPC (invoke)
    ↓
Rust 命令 (main.rs)
    ↓
SQLite (positions.db)

❌ 缺少：
  - 定时任务
  - 实时行情
  - WebSocket 或 Tauri Events
```

---

## 四、数据流对比

### Java 版本的数据流
```
买入操作
    ↓
Controller 接收表单
    ↓
PositionService.saveRecord()
    ↓
PositionRepository.save()
    ↓
MySQL 持久化（新增一条记录，id 自增）

平仓操作
    ↓
Controller 接收 id
    ↓
PositionService.closePosition(id)
    ↓
更新 status = CLOSE
    ↓
MySQL 持久化（不删除记录）

实时显示
    ↓
定时任务获取实时价格
    ↓
存入 Quote.realQuoteMap
    ↓
WebSocket 推送给前端
    ↓
前端实时计算盈亏
```

---

### Tauri 版本的数据流（当前）
```
买入操作
    ↓
BuyPositionForm 提交
    ↓
usePositions.buyPosition()
    ↓
db.savePosition()
    ↓
Tauri invoke('save_position')
    ↓
INSERT OR REPLACE  ❌ 会覆盖同 code 的记录
    ↓
SQLite 持久化

平仓操作
    ❌ 未实现

实时显示
    ❌ 未实现
    ❌ 数据库存储了 current_price（不应该）
```

---

## 五、缺失功能清单

### 5.1 数据库层（高优先级）
- [ ] 修改表结构：主键改为 `id`（UUID 或自增）
- [ ] 添加 `status` 字段（POSITION / CLOSE）
- [ ] 删除计算字段（current_price, pnl, pnl_percentage, profit10, profit20）
- [ ] 删除冗余字段（symbol）
- [ ] 实现数据迁移脚本

### 5.2 Rust 后端 API（高优先级）
- [ ] `save_position()` - 改为 INSERT（不用 REPLACE）
- [ ] `get_codes_in_position()` - 获取所有持仓中的代码
- [ ] `get_position_records(code)` - 获取某个代码的所有买入记录
- [ ] `close_position(id)` - 平仓（改 status）
- [ ] `delete_position(id)` - 删除记录
- [ ] 模块化拆分 main.rs

### 5.3 实时价格功能（中优先级）
- [ ] 实现实时行情 API 调用（如新浪财经、腾讯财经）
- [ ] Rust 定时任务（使用 tokio::time::interval）
- [ ] 全局价格缓存（Arc<Mutex<HashMap>>）
- [ ] 前端通过 Tauri Events 接收实时价格
- [ ] 前端实时计算盈亏

### 5.4 投资组合功能（中优先级）
- [ ] 按代码二级分组（code grouping）
- [ ] TargetProfitLoss 计算（每个代码的汇总盈亏）
- [ ] 建议买卖点计算（±10%）
- [ ] 仓位占比计算（成本仓位率、当前仓位率）

### 5.5 前端功能（低优先级）
- [ ] SellPositionForm 组件（平仓表单）
- [ ] PositionRecordsTable（显示某个代码的所有买入记录）
- [ ] 实时价格显示和自动更新
- [ ] 买卖信号提示（当前价接近建议买卖点）

---

## 六、实施优先级建议

### 阶段 1：数据库重构（1-2天）⭐⭐⭐
**目标：** 对齐 Java 版本的表结构

1. 创建新的表结构（参考 storage-design.md）
2. 实现数据迁移脚本
3. 更新 Rust Position 结构体

**输出：**
- 新的 positions 表（8个字段）
- 迁移脚本
- 备份旧数据

---

### 阶段 2：核心 API 重构（2-3天）⭐⭐⭐
**目标：** 实现 Java 版本的核心持仓管理功能

1. Rust 后端模块化
   - `commands/position.rs` - 持仓命令
   - `db/position_repo.rs` - 数据库操作
   - `models/position.rs` - 数据模型

2. 实现缺失的 API
   - `get_codes_in_position()`
   - `get_position_records(code)`
   - `close_position(id)`

3. 前端适配
   - 更新 TypeScript 类型定义
   - 重写 usePositions hook
   - 创建 SellPositionForm

**输出：**
- 模块化的 Rust 后端
- 完整的持仓管理 API
- 前端组件更新

---

### 阶段 3：实时价格（3-4天）⭐⭐
**目标：** 实现实时行情和自动更新

1. Rust 实时行情服务
   - 封装行情 API（新浪/腾讯/东方财富）
   - 定时任务（tokio::time::interval）
   - 全局缓存（Arc<Mutex<HashMap>>）

2. 前端实时更新
   - Tauri Events 监听价格更新
   - 前端自动计算盈亏
   - WebSocket 或长轮询

**输出：**
- 实时价格后台服务
- 前端实时更新机制

---

### 阶段 4：投资组合增强（2-3天）⭐
**目标：** 实现组合级别的高级功能

1. 按代码二级分组
2. TargetProfitLoss 计算
3. 建议买卖点
4. 仓位占比

**输出：**
- 完整的组合分析功能
- 买卖信号提示

---

## 七、关键差异总结

| 方面 | Java 版本 | Tauri 版本 | 完成度 |
|------|----------|-----------|--------|
| **数据模型** | 8字段，精简设计 | 12字段，冗余多 | 40% |
| **主键设计** | 自增 id，支持多次买入 | code 主键，会覆盖 | 0% |
| **平仓机制** | status 字段标记 | 未实现 | 0% |
| **持仓查询** | 过滤 CLOSE，按 code 分组 | 查询所有，无分组 | 30% |
| **实时价格** | 定时任务 + WebSocket | 未实现 | 0% |
| **组合管理** | 二级分组 + 详细计算 | 简单汇总 | 20% |
| **建议买卖点** | 自动计算 ±10% | 未实现 | 0% |
| **代码结构** | 分层清晰（Service/Repo） | 单文件，需模块化 | 30% |

**总体完成度：约 25%**

---

## 八、与 storage-design.md 和 code-review.md 的关系

- **storage-design.md** - 提供了数据库重构方案（阶段 1）
- **code-review.md** - 提供了代码优化建议（阶段 2）
- **本文档** - 明确了与 Java 版本的功能差距（完整路线图）

**建议实施顺序：**
1. 按 storage-design.md 重构数据库（阶段 1）
2. 按 code-review.md 重构代码结构（阶段 2）
3. 按本文档补充缺失功能（阶段 3-4）

---

**最后更新:** 2025-11-07
**作者:** InvestmentTracker 开发团队
