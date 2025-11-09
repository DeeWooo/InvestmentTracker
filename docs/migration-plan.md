# Java 版本完整迁移计划

> 将 position-minitor-java 的所有功能完整迁移到 Tauri + Next.js 版本

---

## 一、迁移路线图

```
✅ v0.1.0: 基础版本（已完成）
    ├─ 项目结构扁平化
    ├─ 基础持仓录入功能
    └─ 支持多组合

    ↓
✅ 阶段 1: 基础架构完善（部分完成）
    ├─ ✅ 数据库重构
    ├─ ✅ 后端模块化
    └─ ⏳ 前端类型优化
    ↓
⏳ 阶段 2: 核心功能完整化（1-2 周）
    ├─ ✅ 持仓管理 API
    ├─ ✅ 组合管理功能
    └─ ⏳ 数据聚合计算（前端适配）
    ↓
⏳ 阶段 3: 实时服务实现（2-3 周）
    ├─ ⏳ 行情 API 集成
    ├─ ⏳ 定时任务系统
    └─ ⏳ 前端实时更新
    ↓
⏳ 阶段 4: 高级功能完善（1-2 周）
    ├─ ⏳ 买卖建议计算
    ├─ ⏳ 仓位管理
    └─ ⏳ 统计分析
    ↓
完整对齐 Java 版本（v1.0.0）
```

### 当前进度
- **后端架构** ✅ 已完成（2025-11-08）
- **数据库设计** ✅ 已完成（2025-11-08）
- **前端适配** ⏳ 进行中（预计 2-3 天完成）

---

## 二、详细实施计划（按优先级）

### ✅ 第一优先级：数据库和核心 API（已完成）

#### 第 1 天：数据库迁移 ✅ 已完成（2025-11-08）
**参考：** [storage-design.md](./storage-design.md)

**任务清单：**
1. ✅ 备份现有 `positions.db`
2. ✅ 创建迁移脚本（Rust）
   ```rust
   // src-tauri/src/migration.rs
   fn migrate_v0_to_v1() -> Result<()> {
       // 1. 重命名旧表为 positions_old
       // 2. 创建新表结构（8字段）
       // 3. 迁移数据，为每条生成 UUID
       // 4. 验证数据一致性
       // 5. 删除备份表（可选）
   }
   ```
3. ✅ 更新 Position 结构体
   ```rust
   pub struct Position {
       pub id: String,              // UUID
       pub code: String,
       pub name: String,
       pub buy_price: f64,
       pub buy_date: String,
       pub quantity: i32,
       pub status: String,          // "POSITION" | "CLOSE"
       pub portfolio: String,
   }
   ```
4. ✅ 创建 SQL 初始化脚本
5. ✅ 测试迁移流程

**验收标准：**
- ✅ 新表结构创建成功
- ✅ 旧数据全部迁移且数据一致
- ✅ 新 Position 结构体编译通过
- ✅ 支持从零开始创建数据库

---

#### 第 2-3 天：后端模块化 ✅ 已完成（2025-11-08）
**参考：** [code-review.md](./code-review.md) 中的 Rust 优化建议

**项目结构（已实现）：**
```
src-tauri/src/
├── main.rs                 # 应用入口 ✅
├── lib.rs                  # 模块声明 ✅
├── commands/               # ✅ 已创建
│   ├── mod.rs              # ✅
│   └── position.rs         # 持仓命令 ✅
├── db/                     # ✅ 已创建
│   ├── mod.rs              # ✅
│   └── position_repo.rs    # 持仓数据层 ✅
├── models/                 # ✅ 已创建
│   ├── mod.rs              # ✅
│   └── position.rs         # Position 结构体 ✅
├── error.rs                # ✅ 错误处理模块 ✅
└── migration.rs            # ✅ 数据库迁移模块 ✅
```

**任务清单：**
1. ✅ 创建错误处理模块
   ```rust
   // src-tauri/src/error.rs
   pub enum AppError {
       DatabaseError(String),
       NotFound(String),
       InvalidInput(String),
   }
   ```
2. ✅ 提取 Position 结构体到 `models/position.rs`
3. ✅ 创建 `db/position_repo.rs`（数据库操作层）
4. ✅ 创建 `commands/position.rs`（Tauri 命令）
5. ✅ 重写 `main.rs`（只包含应用入口）

**验收标准：**
- ✅ 代码可编译且无警告
- ✅ 每个模块职责清晰
- ✅ 错误处理统一
- ✅ 无重复代码

---

#### 第 4-5 天：核心 API 实现
**需要实现的 Tauri 命令：**

1. **持仓查询 API**
   ```rust
   // 1. 获取所有持仓代码（去重）
   #[tauri::command]
   async fn get_codes_in_position() -> Result<Vec<String>, String>

   // 2. 获取某个代码的所有买入记录
   #[tauri::command]
   async fn get_position_records(code: String) -> Result<Vec<Position>, String>

   // 3. 获取当前持仓（status='POSITION'）
   #[tauri::command]
   async fn get_positions() -> Result<Vec<Position>, String>
   ```

2. **持仓管理 API**
   ```rust
   // 4. 新增持仓记录
   #[tauri::command]
   async fn save_position(
       code: String,
       name: String,
       buy_price: f64,
       buy_date: String,
       quantity: i32,
       portfolio: String,
   ) -> Result<Position, String>

   // 5. 平仓（改状态为 CLOSE）
   #[tauri::command]
   async fn close_position(id: String) -> Result<(), String>

   // 6. 删除记录
   #[tauri::command]
   async fn delete_position(id: String) -> Result<(), String>
   ```

3. **组合查询 API**
   ```rust
   // 7. 获取组合列表
   #[tauri::command]
   async fn get_portfolios() -> Result<Vec<String>, String>

   // 8. 获取组合中的所有持仓
   #[tauri::command]
   async fn get_portfolio_positions(portfolio: String)
       -> Result<Vec<Position>, String>
   ```

**验收标准：**
- ✅ 所有 API 实现完整
- ✅ 单元测试覆盖核心逻辑
- ✅ 错误处理完善
- ✅ 前端能正常调用

---

#### 第 6 天：前端适配
**参考：** [code-review.md](./code-review.md) 中的前端优化建议

**任务清单：**
1. 更新 TypeScript 类型定义
   ```typescript
   // src/lib/types.ts

   // 数据库记录类型
   export interface PositionRecord {
       id: string;
       code: string;
       name: string;
       buy_price: number;
       buy_date: string;
       quantity: number;
       status: 'POSITION' | 'CLOSE';
       portfolio: string;
   }

   // 展示类型（包含计算字段）
   export interface PositionDisplay {
       code: string;
       name: string;
       portfolio: string;
       records: PositionRecord[];
       totalQuantity: number;
       avgCostPrice: number;
       totalCost: number;
       currentPrice: number;
       currentValue: number;
       pnl: number;
       pnlPercentage: number;
   }
   ```

2. 重写 `usePositions` Hook
   ```typescript
   // src/hooks/usePositions.ts
   export function usePositions() {
       // 获取所有持仓
       const fetchPositions = async () => {
           const codes = await invoke<string[]>("get_codes_in_position");
           const positions = await Promise.all(
               codes.map(code =>
                   invoke<PositionRecord[]>("get_position_records", { code })
               )
           );
           // 计算和转换...
       };

       // 买入
       const buyPosition = async (data) => {
           await invoke("save_position", data);
           await fetchPositions();
       };

       // 平仓
       const closePosition = async (id: string) => {
           await invoke("close_position", { id });
           await fetchPositions();
       };

       return { positions, buyPosition, closePosition, ... };
   }
   ```

3. 简化 `BuyPositionForm`
4. 创建 `SellPositionForm` 组件
5. 更新 `PositionList` 组件

**验收标准：**
- ✅ TypeScript 编译无错
- ✅ 前端能正常显示持仓
- ✅ 买入、平仓功能正常
- ✅ 与新 API 集成完美

---

### 🟡 第二优先级：数据聚合和计算（1 周）

#### 第 7 天：组合数据聚合

**后端新增方法（Java 版本对应）：**

1. **按代码分组汇总**
   ```rust
   // 对应 Java 版本的 TargetProfitLoss 计算
   #[tauri::command]
   async fn get_position_summary(code: String)
       -> Result<PositionSummary, String> {
       // SELECT SUM(quantity), AVG(buy_price)...
       // 返回：总数量、平均成本价、总成本
   }
   ```

2. **组合级别汇总**
   ```rust
   #[tauri::command]
   async fn get_portfolio_summary(portfolio: String)
       -> Result<PortfolioSummary, String> {
       // 对应 Java 版本的 PortfolioProfitLoss
       // 返回：组合所有持仓的汇总信息
   }
   ```

3. **全量汇总**
   ```rust
   #[tauri::command]
   async fn get_all_summary() -> Result<AllSummary, String> {
       // 返回所有组合的全量汇总
   }
   ```

**需要实现的计算函数：**
```rust
// 计算平均成本价
fn calc_avg_cost_price(records: &[Position]) -> f64 {
    let total_cost: f64 = records.iter()
        .map(|r| r.buy_price * r.quantity as f64)
        .sum();
    let total_qty: i32 = records.iter().map(|r| r.quantity).sum();
    if total_qty > 0 {
        total_cost / total_qty as f64
    } else {
        0.0
    }
}

// 计算总成本
fn calc_total_cost(records: &[Position]) -> f64 {
    records.iter()
        .map(|r| r.buy_price * r.quantity as f64)
        .sum()
}
```

**验收标准：**
- ✅ 汇总计算准确
- ✅ SQL 查询性能优化（使用 GROUP BY）
- ✅ 前端能获取和展示汇总数据
- ✅ 支持多个投资组合

---

#### 第 8 天：前端聚合显示

**新增组件：**

1. `PortfolioSummary` 组件 - 显示组合级别汇总
2. `PositionGroupBy` 组件 - 按代码分组显示
3. `StatisticsPanel` 组件 - 统计信息展示

**需要显示的字段：**
```typescript
// 按代码分组的汇总
- 代码 (code)
- 名称 (name)
- 总数量 (totalQuantity)
- 平均成本价 (avgCostPrice)
- 总成本 (totalCost)
- 所有买入记录列表

// 组合级别汇总
- 组合名称
- 总持仓成本
- 当前总价值（需要实时价格）
- 总盈亏（需要实时价格）
- 盈亏率（需要实时价格）
- 每个代码的明细

// 全量汇总
- 所有组合的统计
- 总资产、总成本、总盈亏
```

**验收标准：**
- ✅ 组件显示正确
- ✅ 数据自动刷新
- ✅ 支持多组合展示
- ✅ 响应式布局

---

### 🟠 第三优先级：实时价格服务（2 周）

#### 第 9-10 天：行情 API 集成

**选择行情数据源：**

**方案 A：新浪财经（推荐）**
```
URL: https://hq.sinajs.cn/list=sh600519
返回格式：var hq_str_sh600519="贵州茅台,1850.00,..."
```

**方案 B：腾讯财经**
```
URL: https://qt.gtimg.cn/q=sh600519
返回格式：JSON
```

**方案 C：东方财富**
```
通过 HTTP API 获取实时数据
```

**任务清单：**

1. 创建行情服务模块
   ```rust
   // src-tauri/src/services/quote_service.rs
   pub struct QuoteService;

   impl QuoteService {
       pub async fn fetch_real_price(code: &str) -> Result<RealQuote> {
           // 调用 HTTP API
           // 解析返回数据
           // 返回 RealQuote { code, name, price }
       }

       pub async fn fetch_batch(codes: Vec<String>) -> Result<Vec<RealQuote>> {
           // 批量获取价格（提高效率）
       }
   }
   ```

2. 实现 HTTP 客户端（使用 `reqwest`）
   ```toml
   # Cargo.toml
   reqwest = { version = "0.11", features = ["json"] }
   tokio = { version = "1", features = ["full"] }
   ```

3. 添加结构体
   ```rust
   pub struct RealQuote {
       pub code: String,
       pub name: String,
       pub price: f64,
       pub timestamp: i64,
   }
   ```

4. 测试行情数据获取
   ```rust
   #[test]
   async fn test_fetch_price() {
       let quote = QuoteService::fetch_real_price("sh600519").await;
       assert!(quote.is_ok());
   }
   ```

**验收标准：**
- ✅ HTTP 请求成功
- ✅ 数据解析正确
- ✅ 错误处理完善
- ✅ 批量获取高效

---

#### 第 11 天：定时任务系统

**任务清单：**

1. 创建定时任务管理器
   ```rust
   // src-tauri/src/tasks/scheduler.rs
   pub struct PriceScheduler {
       cache: Arc<Mutex<HashMap<String, RealQuote>>>,
   }

   impl PriceScheduler {
       pub async fn start(&self) {
           // 创建定时任务
           tokio::spawn(self.update_prices());
       }

       async fn update_prices(&self) {
           let mut interval = tokio::time::interval(Duration::from_secs(10));

           loop {
               interval.tick().await;

               // 1. 获取所有持仓代码
               let codes = self.get_codes_in_position().await;

               // 2. 批量获取实时价格
               let quotes = QuoteService::fetch_batch(codes).await;

               // 3. 更新缓存
               let mut cache = self.cache.lock().unwrap();
               for quote in quotes {
                   cache.insert(quote.code.clone(), quote);
               }

               // 4. 发送事件给前端
               self.emit_price_update().await;
           }
       }

       pub fn get_cache(&self) -> Arc<Mutex<HashMap<String, RealQuote>>> {
           self.cache.clone()
       }
   }
   ```

2. 应用启动时启动定时任务
   ```rust
   fn main() {
       let scheduler = PriceScheduler::new();
       let scheduler_clone = scheduler.clone();

       std::thread::spawn(move || {
           let rt = tokio::runtime::Runtime::new().unwrap();
           rt.block_on(scheduler_clone.start());
       });

       tauri::Builder::default()
           .manage(scheduler)
           .invoke_handler(...)
           .run(...)
   }
   ```

3. 暴露价格查询 API
   ```rust
   #[tauri::command]
   async fn get_real_price(code: String, state: tauri::State<'_, PriceScheduler>)
       -> Result<f64, String> {
       let cache = state.get_cache();
       let quote = cache.lock().unwrap().get(&code).cloned();
       Ok(quote.map(|q| q.price).unwrap_or(0.0))
   }
   ```

**验收标准：**
- ✅ 定时任务正常运行
- ✅ 缓存数据及时更新
- ✅ 前端能获取实时价格
- ✅ 性能无问题（不阻塞 UI）

---

#### 第 12 天：前端实时更新

**任务清单：**

1. 创建实时价格 Hook
   ```typescript
   // src/hooks/useRealPrice.ts
   export function useRealPrice() {
       const [prices, setPrices] = useState<Record<string, number>>({});

       useEffect(() => {
           // 监听 Tauri 事件（价格更新）
           const unlisten = listen('price_update', (event) => {
               const newPrices = event.payload as Record<string, number>;
               setPrices(prev => ({ ...prev, ...newPrices }));
           });

           return () => {
               unlisten.then(fn => fn());
           };
       }, []);

       const getPrice = async (code: string) => {
           return await invoke<number>('get_real_price', { code });
       };

       return { prices, getPrice };
   }
   ```

2. 前端实时计算盈亏
   ```typescript
   // 当有实时价格时，计算盈亏
   const calculatePnL = (
       totalCost: number,
       totalQuantity: number,
       realPrice: number
   ) => {
       const currentValue = totalQuantity * realPrice;
       const pnl = currentValue - totalCost;
       const pnlPercentage = (pnl / totalCost) * 100;

       return { pnl, pnlPercentage, currentValue };
   };
   ```

3. 更新显示组件
   - 在持仓列表中显示实时价格
   - 动态更新盈亏信息
   - 用颜色标记涨跌（绿色/红色）

**验收标准：**
- ✅ 实时价格显示准确
- ✅ 盈亏自动计算
- ✅ 更新流畅无卡顿
- ✅ 支持离线缓存

---

### 🟢 第四优先级：高级功能（1 周）

#### 第 13-14 天：建议买卖点和仓位计算

**对应 Java 版本的功能：**

```rust
// 1. 建议买卖点（最后买入价的 ±10%）
fn calc_trading_points(last_buy_price: f64) -> (f64, f64) {
    let buy_point = last_buy_price * 0.9;
    let sell_point = last_buy_price * 1.1;
    (buy_point, sell_point)
}

// 2. 成本仓位率
// cost_position_rate = SUM(buy_price * quantity) / FULL_POSITION
// (假设满仓金额为 50000)

// 3. 当前仓位率
// current_position_rate = real_price * total_quantity / FULL_POSITION

// 4. 盈亏率
// pnl_rate = pnl / total_cost
```

**API 实现：**
```rust
#[tauri::command]
async fn get_trading_signals(code: String)
    -> Result<TradingSignal, String> {
    // 返回：code, 建议买点, 建议卖点, 当前价格, 信号(买/卖/持)
}

#[tauri::command]
async fn get_position_rate(code: String, full_position: f64)
    -> Result<PositionRate, String> {
    // 返回：成本仓位率, 当前仓位率
}
```

**前端展示：**
```typescript
// 新增 TradingSignalPanel 组件
// 显示：当前价、建议买点、建议卖点、买卖信号

// 颜色规则：
// - 价格 < 建议买点：绿色（买入信号）
// - 价格 > 建议卖点：红色（卖出信号）
// - 在中间：黄色（持仓）
```

---

### 📊 第五优先级：统计和分析（可选）

#### 第 15 天：统计功能

**新增统计维度：**

1. **按时间统计**
   - 月度收益
   - 年度收益
   - 累计收益

2. **按组合统计**
   - 组合绩效排名
   - 组合对比

3. **按个股统计**
   - 个股收益率排名
   - 个股交易次数
   - 个股平均持仓期

**SQL 查询示例：**
```sql
-- 月度收益统计
SELECT
    strftime('%Y-%m', buy_date) as month,
    SUM(quantity * buy_price) as total_cost,
    COUNT(*) as transaction_count
FROM positions
WHERE status = 'POSITION'
GROUP BY month;
```

---

## 三、分阶段交付物

### 第一阶段（2 周）
```
✅ 数据库完整迁移
✅ 后端模块化架构
✅ 核心 API 实现（7 个命令）
✅ 前端类型重构
✅ 基础持仓管理功能
```

### 第二阶段（1 周）
```
✅ 数据聚合计算
✅ 组合汇总功能
✅ 前端统计展示
```

### 第三阶段（2 周）
```
✅ 实时行情 API
✅ 定时任务系统
✅ 前端实时更新
✅ 缓存管理
```

### 第四阶段（1 周）
```
✅ 买卖建议计算
✅ 交易信号显示
✅ 仓位占比展示
```

---

## 四、风险和缓解措施

### 4.1 数据迁移风险
| 风险 | 影响 | 缓解措施 |
|------|------|--------|
| 数据丢失 | 高 | 完整备份，验证迁移 |
| 类型转换错误 | 中 | 详细测试脚本 |
| 主键冲突 | 高 | 使用 UUID 确保唯一性 |

### 4.2 行情 API 风险
| 风险 | 影响 | 缓解措施 |
|------|------|--------|
| API 限流 | 中 | 实现速率限制和重试 |
| 网络超时 | 中 | 超时控制和降级方案 |
| 数据错误 | 高 | 数据验证和异常处理 |

### 4.3 性能风险
| 风险 | 影响 | 缓解措施 |
|------|------|--------|
| 查询慢 | 中 | 添加数据库索引 |
| 内存溢出 | 高 | 分页查询，缓存管理 |
| UI 卡顿 | 高 | 异步加载，虚拟滚动 |

---

## 五、测试计划

### 单元测试
- [ ] 数据库迁移脚本
- [ ] 数据聚合计算函数
- [ ] 行情数据解析
- [ ] 交易信号计算

### 集成测试
- [ ] 前后端 API 调用
- [ ] 数据库事务
- [ ] 定时任务执行

### 功能测试
- [ ] 买入、平仓流程
- [ ] 组合管理
- [ ] 实时价格更新
- [ ] 盈亏计算准确性

### 性能测试
- [ ] 1000+ 条记录的查询性能
- [ ] 实时更新延迟
- [ ] 内存占用

---

## 六、时间预估

| 阶段 | 工作量 | 时间 | 完成后状态 |
|------|--------|------|----------|
| 阶段 1 | 高 | 2 周 | 核心功能完整 |
| 阶段 2 | 中 | 1 周 | 组合功能完善 |
| 阶段 3 | 高 | 2 周 | 实时更新就绪 |
| 阶段 4 | 低 | 1 周 | 高级功能完成 |
| **总计** | | **6 周** | **v1.0.0** |

---

## 七、建议实施方式

### 并行开发（推荐）
```
Week 1-2:
  - 小组 A：数据库迁移 + 后端模块化
  - 小组 B：前端类型优化 + 基础 UI

Week 3:
  - 小组 A：数据聚合计算
  - 小组 B：统计展示组件

Week 4-5:
  - 小组 A：行情 API + 定时任务
  - 小组 B：实时 UI 更新

Week 6:
  - 集成测试和优化
```

### 单人顺序开发
```
建议顺序：
  数据库 → 后端 API → 前端适配 → 数据聚合 → 实时价格 → 高级功能
```

---

## 八、成功标准

✅ **v1.0.0 完成条件：**

1. **功能对齐**
   - 所有 Java 版本的核心功能都已实现
   - 代码质量可接受（通过 lint）
   - 性能可接受（无明显卡顿）

2. **数据准确**
   - 成本计算准确
   - 盈亏计算准确
   - 实时价格正确

3. **用户体验**
   - 界面清晰易用
   - 响应快速
   - 数据实时更新

4. **代码质量**
   - 代码可维护
   - 有适当的注释
   - 通过单元测试

---

## 九、迁移进度总结

### ✅ 已完成的工作（截至 2025-11-08）

#### 阶段 1: 基础架构完善 ✅
- [x] **数据库重构** - 迁移脚本、新表结构（8字段）
- [x] **后端模块化** - commands/, db/, models/, error.rs, migration.rs
- [x] **核心 API 实现** - 所有持仓和组合管理 API

#### 项目当前状态
- **版本**: v0.2.0 开发中
- **后端**: 100% 完成
- **数据库**: 100% 完成
- **前端**: 60% 完成（需要适配新 API）

### ⏳ 待完成的工作

#### 阶段 2: 前端适配（2-3 天）
- [ ] 更新 `src/lib/types.ts`（分离存储类型和展示类型）
- [ ] 重写 `src/hooks/usePositions.ts`（适配新 API）
- [ ] 更新 `src/components/BuyPositionForm.tsx`
- [ ] 新增 `src/components/SellPositionForm.tsx`

#### 阶段 3: 实时服务（2-3 周）
- [ ] 行情 API 集���
- [ ] 定时任务系统
- [ ] 前端实时更新

#### 阶段 4: 高级功能（1-2 周）
- [ ] 买卖建议计算
- [ ] 仓位管理
- [ ] 统计分析

### 更新的时间预估

| 阶段 | 原计划 | 实际进度 | 剩余时间 |
|------|--------|----------|----------|
| 阶段 1 | 2-3 周 | ✅ 已完成 | 0 |
| 阶段 2 | 1-2 周 | ⏳ 进行中 | 2-3 天 |
| 阶段 3 | 2-3 周 | ⏳ 未开始 | 2-3 周 |
| 阶段 4 | 1-2 周 | ⏳ 未开始 | 1-2 周 |
| **总计** | **6 周** | | **2-3 周** |

### 成功案例

#### ✅ 成功完成的迁移
1. **数据无缝迁移** - 旧数据完美迁移到新结构
2. **架构优化** - 代码模块化，职责清晰
3. **API 设计** - 语义清晰，易于使用
4. **类型安全** - Rust + TypeScript 强类型支持

---

**下一步：优先完成前端适配，然后进入实时服务开发**

参考文档：
- [storage-design.md](./storage-design.md) - 数据库设计
- [code-review.md](./code-review.md) - 代码优化
- [gap-analysis.md](./gap-analysis.md) - 功能差距分析

## 十、文档更新记录

| 日期 | 更新内容 |
|------|---------|
| 2025-11-08 | 更新迁移进度：标记后端已完成，调整时间预估 |
| 2025-11-07 | 初始版本：完整迁移计划制定 |
