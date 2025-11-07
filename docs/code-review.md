# InvestmentTracker 代码优化建议

> 基于存储方案重构，对现有代码的优化意见

## 一、概览

### 现有项目结构
```
InvestmentTracker/
├── next-app/
│   ├── src/
│   │   ├── app/           # Next.js 应用层
│   │   ├── components/    # React 组件
│   │   ├── hooks/         # 自定义 Hook
│   │   ├── lib/           # 工具函数和类型
│   │   └── types/         # TypeScript 类型定义
│   └── src-tauri/         # Rust 后端（Tauri）
```

### 现有问题分析

基于前面的存储方案讨论，目前代码有以下问题：

---

## 二、TypeScript 类型定义优化

### 当前问题（src/lib/types.ts）

```typescript
// ❌ 问题 1: Position 定义过于复杂
export interface Position {
  symbol: string;
  code: string;
  name: string;
  quantity: number;
  buy_price: number;
  buy_date: string;
  portfolio: string;
  current_price: number;      // ❌ 实时数据不应该存在 types 里
  pnl: number;                // ❌ 计算字段，会造成数据不一致
  pnl_percentage: number;     // ❌ 计算字段
  current_position?: number;  // ❌ 重复定义
  cost_position?: number;     // ❌ 重复定义
  profit10?: number;          // ❌ Java 版本没有
  profit20?: number;          // ❌ Java 版本没有
  transactions?: Transaction[]; // ❌ 不应该在这里
}

// ❌ 问题 2: Transaction 定义有冗余
export interface Transaction {
  date: string;
  price: number;
  quantity: number;
  pnl: number;                // ❌ 计算字段
  pnl_percentage: number;     // ❌ 计算字段
}
```

### 优化建议

**应该将 types 分为两类：**

#### 1. **数据库存储类型（对应数据库表结构）**
```typescript
// 数据库中存储的记录
export interface PositionRecord {
  id: string;           // UUID
  code: string;
  name: string;
  buy_price: number;
  buy_date: string;
  quantity: number;
  status: 'POSITION' | 'CLOSE';
  portfolio: string;
}
```

#### 2. **展示/计算类型（前端使用）**
```typescript
// 前端显示的持仓（带计算字段）
export interface PositionDisplay {
  code: string;
  name: string;
  portfolio: string;

  // 数据库数据
  records: PositionRecord[];

  // 计算字段（前端计算）
  totalQuantity: number;
  avgCostPrice: number;
  totalCost: number;

  // 实时数据（从 API 获取）
  currentPrice: number;
  currentValue: number;

  // 盈亏（前端计算）
  pnl: number;
  pnlPercentage: number;
}

// 组合级别的汇总
export interface PortfolioSummary {
  portfolio: string;
  positions: PositionDisplay[];
  totalCost: number;
  totalValue: number;
  pnl: number;
  pnlPercentage: number;
}
```

---

## 三、Rust 后端优化（src-tauri/src/main.rs）

### 当前问题

#### 问题 1: 表结构与数据库设计不一致
```rust
// ❌ 现在的表结构有问题
"CREATE TABLE IF NOT EXISTS positions (
    code TEXT PRIMARY KEY,      // ❌ 主键是 code，会导致覆盖
    quantity INTEGER NOT NULL,
    buy_price REAL NOT NULL,
    buy_date TEXT NOT NULL,
    portfolio TEXT,
    symbol TEXT,
    current_price REAL,         // ❌ 实时数据不应该存
    pnl REAL,                   // ❌ 计算字段
    pnl_percentage REAL,        // ❌ 计算字段
    profit10 REAL,              // ❌ Java 版本没有
    profit20 REAL               // ❌ Java 版本没有
)"
```

#### 问题 2: INSERT OR REPLACE 会覆盖数据
```rust
// ❌ 这样会导致多次买入时第一次的记录被覆盖
"INSERT OR REPLACE INTO positions (...)"
```

#### 问题 3: API 设计不清晰
```rust
// ❌ 调用方式不清楚意图
async fn closePosition(code) -> ...  // 平仓哪一条记录？
async fn partialClose(code, quantity) -> ...  // 如何知道平仓哪些记录？
```

### 优化建议

#### 1. **新的数据库初始化**
```rust
fn init_db() -> SqliteResult<Connection> {
    let conn = Connection::open("positions.db")?;

    // 创建新表结构（对齐 Java 版本）
    conn.execute(
        "CREATE TABLE IF NOT EXISTS positions (
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
    )?;

    // 创建索引
    conn.execute("CREATE INDEX IF NOT EXISTS idx_code ON positions(code)", [])?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_status ON positions(status)", [])?;

    Ok(conn)
}
```

#### 2. **清晰的 API 设计**
```rust
// ✅ 保存新的买入记录
#[tauri::command]
async fn save_position(
    code: String,
    name: String,
    buy_price: f64,
    buy_date: String,
    quantity: i32,
    portfolio: String,
) -> Result<PositionRecord, String>

// ✅ 获取所有持仓中的不同 code
#[tauri::command]
async fn get_codes_in_position() -> Result<Vec<String>, String>

// ✅ 获取某个 code 的所有买入记录
#[tauri::command]
async fn get_position_records(code: String) -> Result<Vec<PositionRecord>, String>

// ✅ 平仓特定的一条记录（按 id）
#[tauri::command]
async fn close_position(id: String) -> Result<(), String>

// ✅ 删除记录
#[tauri::command]
async fn delete_position(id: String) -> Result<(), String>

// ✅ 获取计算后的持仓汇总（前端需要）
#[tauri::command]
async fn get_position_summary(code: String) -> Result<PositionSummary, String>
```

#### 3. **计算逻辑清晰化**
```rust
// 核心计算函数（不存储，只计算）
fn calculate_position_summary(records: Vec<PositionRecord>) -> PositionSummary {
    let total_quantity: i32 = records.iter().sum_by(|r| r.quantity);
    let total_cost: f64 = records.iter().sum_by(|r| r.quantity as f64 * r.buy_price);
    let avg_cost_price = if total_quantity > 0 {
        total_cost / total_quantity as f64
    } else {
        0.0
    };

    PositionSummary {
        total_quantity,
        total_cost,
        avg_cost_price,
        // 其他字段由前端计算
    }
}
```

---

## 四、前端组件优化（React）

### 当前问题

#### 问题 1: usePositions Hook 有过时的方法调用
```typescript
// ❌ 调用已删除的方法
async fn deletePosition(code: string) {
  await invoke("delete_position", { code });  // 现在需要 id
}

async fn closePosition(code: string) {
  await invoke("close_position", { code });   // 现在需要 id
}

async fn partialClose(code: string, quantity: number) {
  await invoke("partial_close_position", ...);  // 后端没有这个方法
}
```

#### 问题 2: BuyPositionForm 逻辑混乱
```typescript
// ❌ 混淆了数据库字段和展示字段
const position: Position = {
  symbol: formData.symbol,
  code: formData.code || formData.symbol,
  name: formData.name || formData.symbol,
  quantity: Number(formData.quantity),
  buy_price: Number(formData.price),
  buy_date: formData.date,
  // ... 这里有很多默认值和计算字段
};
```

### 优化建议

#### 1. **更新 usePositions Hook**
```typescript
export function usePositions() {
  const [positions, setPositions] = useState<PositionDisplay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取所有持仓
  const fetchPositions = async () => {
    try {
      setLoading(true);
      const codes = await invoke<string[]>("get_codes_in_position");

      // 为每个 code 获取详细信息
      const positions: PositionDisplay[] = await Promise.all(
        codes.map(async (code) => {
          const records = await invoke<PositionRecord[]>("get_position_records", { code });
          return buildPositionDisplay(code, records);
        })
      );

      setPositions(positions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取持仓失败");
    } finally {
      setLoading(false);
    }
  };

  // 买入
  const buyPosition = async (
    code: string,
    name: string,
    quantity: number,
    price: number,
    date: string,
    portfolio: string
  ) => {
    try {
      await invoke("save_position", {
        code, name, quantity, buy_price: price, buy_date: date, portfolio
      });
      await fetchPositions();
    } catch (err) {
      throw err instanceof Error ? err : new Error("买入失败");
    }
  };

  // 平仓（平仓特定的一条记录）
  const closePosition = async (id: string) => {
    try {
      await invoke("close_position", { id });
      await fetchPositions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "平仓失败");
    }
  };

  // 删除
  const deletePosition = async (id: string) => {
    try {
      await invoke("delete_position", { id });
      await fetchPositions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  };

  useEffect(() => {
    fetchPositions();
    const timer = setInterval(fetchPositions, 60000);
    return () => clearInterval(timer);
  }, []);

  return {
    positions,
    loading,
    error,
    buyPosition,
    closePosition,
    deletePosition,
    refresh: fetchPositions,
  };
}
```

#### 2. **简化 BuyPositionForm**
```typescript
interface BuyPositionFormProps {
  onSubmit: (data: {
    code: string;
    name: string;
    quantity: number;
    price: number;
    date: string;
    portfolio: string;
  }) => Promise<void>;
}

export function BuyPositionForm({ onSubmit }: BuyPositionFormProps) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    quantity: '',
    price: '',
    date: '',
    portfolio: 'default',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await onSubmit({
      code: formData.code,
      name: formData.name,
      quantity: Number(formData.quantity),
      price: Number(formData.price),
      date: formData.date,
      portfolio: formData.portfolio,
    });
  };

  // ... 其他代码
}
```

#### 3. **新增 SellPositionForm（平仓）**
```typescript
interface SellPositionFormProps {
  positions: PositionDisplay[];
  onSubmit: (id: string) => Promise<void>;
}

export function SellPositionForm({ positions, onSubmit }: SellPositionFormProps) {
  const [selectedId, setSelectedId] = useState('');

  const handleSubmit = async () => {
    if (!selectedId) return;
    await onSubmit(selectedId);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>平仓</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>选择要平仓的记录</DialogTitle>
        </DialogHeader>

        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          <option value="">请选择</option>
          {positions.map(pos =>
            pos.records.map(record => (
              <option key={record.id} value={record.id}>
                {pos.code} - {record.buy_date} - {record.quantity}股 @ {record.buy_price}
              </option>
            ))
          )}
        </select>

        <Button onClick={handleSubmit}>确认平仓</Button>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 五、API 接口（db.ts）

### 当前问题
```typescript
// ❌ 接口与新的后端 API 不一致
export const db = {
  async savePosition(position: Position): Promise<Position> { ... },
  async getPositions(): Promise<Position[]> { ... },
  async resetDatabase(): Promise<void> { ... },
};
```

### 优化建议
```typescript
export const db = {
  // 保存新的买入记录
  async savePosition(data: {
    code: string;
    name: string;
    buy_price: number;
    buy_date: string;
    quantity: number;
    portfolio: string;
  }): Promise<PositionRecord> {
    return await invoke('save_position', data);
  },

  // 获取所有持仓中的 code
  async getCodesInPosition(): Promise<string[]> {
    return await invoke('get_codes_in_position');
  },

  // 获取某个 code 的所有买入记录
  async getPositionRecords(code: string): Promise<PositionRecord[]> {
    return await invoke('get_position_records', { code });
  },

  // 获取计算后的持仓汇总
  async getPositionSummary(code: string): Promise<PositionSummary> {
    return await invoke('get_position_summary', { code });
  },

  // 平仓
  async closePosition(id: string): Promise<void> {
    return await invoke('close_position', { id });
  },

  // 删除
  async deletePosition(id: string): Promise<void> {
    return await invoke('delete_position', { id });
  },
};
```

---

## 六、实施优化的步骤

### 阶段 1: 数据迁移（1天）
- [ ] 执行数据库迁移脚本
- [ ] 备份旧数据

### 阶段 2: 后端重构（2天）
- [ ] 重写 Rust main.rs（新表结构、新 API）
- [ ] 实现计算函数
- [ ] 编写单元测试

### 阶段 3: 前端适配（2-3天）
- [ ] 更新 types.ts（分离存储类型和展示类型）
- [ ] 重写 db.ts（新的 API 接口）
- [ ] 重写 usePositions hook
- [ ] 更新 BuyPositionForm
- [ ] 新增 SellPositionForm
- [ ] 更新其他组件

### 阶段 4: 测试（1day）
- [ ] 集成测试
- [ ] 兼容性测试

**总计：6-7天**

---

## 七、总结

### 主要优化点

1. **数据库结构** - 简化到 8 个字段，避免数据覆盖
2. **类型定义** - 分离存储类型和展示类型，避免混淆
3. **API 设计** - 清晰的语义，每个 API 职责明确
4. **前端逻辑** - 清晰的数据流，计算字段在前端计算

### 优化后的架构

```
用户操作
  ↓
前端组件（BuyPositionForm / SellPositionForm）
  ↓
Custom Hook（usePositions）
  ↓
数据库 API（db.ts）
  ↓
Tauri 后端（Rust）
  ↓
SQLite 数据库
  ↑
持仓计算（GROUP BY + SUM）
  ↓
前端显示（计算盈亏、实时价格）
```

### 代码质量改进

- ✅ 类型安全更强
- ✅ API 职责更清晰
- ✅ 数据流更易追踪
- ✅ 错误处理更一致
- ✅ 易于扩展和维护
