# InvestmentTracker 代码优化建议

> 基于存储方案重构，对现有代码的优化意见

## 一、概览

### 现有项目结构（已扁平化）
```
InvestmentTracker/
├── src/                   # 前端代码（Next.js + React）
│   ├── app/               # Next.js 应用层
│   ├── components/        # React 组件
│   ├── hooks/             # 自定义 Hook
│   ├── lib/               # 工具函数和类型
│   └── types/             # TypeScript 类型定义
│
└── src-tauri/             # 后端代码（Rust + Tauri）
    ├── src/
    │   ├── main.rs        # 应用入口
    │   ├── lib.rs         # 库文件
    │   ├── commands/       # Tauri 命令（已模块化）
    │   ├── db/            # 数据库操作（已模块化）
    │   ├── models/        # 数据模型（已模块化）
    │   ├── error.rs       # 错误处理
    │   └── migration.rs   # 数据库迁移
```

### 优化进度

#### ✅ 已完成的优化
1. **项目结构扁平化** - `next-app/` 层级已移除，代码直接在根目录
2. **后端模块化** - `main.rs` 已拆分为 `commands/`, `db/`, `models/` 等模块
3. **数据库迁移** - 新增 `migration.rs`，支持版本升级
4. **错误处理** - 新增 `error.rs` 模块
5. **数据库表结构** - 已优化为 8 个字段（id, code, name, buy_price, buy_date, quantity, status, portfolio）

#### ⏳ 待优化项（仍需完成）
1. **前端类型分离** - 需将 `src/lib/types.ts` 拆分为存储类型和展示类型
2. **前端 Hook 更新** - `usePositions` 需适配新的后端 API
3. **新增平仓组件** - 需创建 `SellPositionForm` 组件

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

## 三、Rust 后端优化（src-tauri/src）

### 优化状态：✅ 主要已完成

#### ✅ 已实现的优化

1. **表结构优化** - 数据库已采用正确的 8 字段设计
   ```rust
   // ✅ 现有的表结构正确
   CREATE TABLE IF NOT EXISTS positions (
       id TEXT PRIMARY KEY,
       code TEXT NOT NULL,
       name TEXT NOT NULL,
       buy_price REAL NOT NULL,
       buy_date TEXT NOT NULL,
       quantity INTEGER NOT NULL,
       status TEXT NOT NULL DEFAULT 'POSITION',
       portfolio TEXT
   )
   ```

2. **模块化架构** - 代码已按以下结构组织
   - `commands/position.rs` - 所有 Tauri 命令
   - `db/position_repo.rs` - 数据库操作
   - `models/position.rs` - 数据模型
   - `error.rs` - 错误处理
   - `migration.rs` - 数据库迁移

3. **清晰的 API 设计** - 已实现的命令
   ```rust
   // ✅ 保存新的买入记录
   #[tauri::command]
   pub async fn save_position(...) -> Result<Position, String>

   // ✅ 获取所有持仓中的不同 code
   #[tauri::command]
   pub async fn get_codes_in_position() -> Result<Vec<String>, String>

   // ✅ 获取某个 code 的所有买入记录
   #[tauri::command]
   pub async fn get_position_records(code: String) -> Result<Vec<Position>, String>

   // ✅ 平仓特定的一条记录（按 id）
   #[tauri::command]
   pub async fn close_position(id: String) -> Result<(), String>

   // ✅ 删除记录
   #[tauri::command]
   pub async fn delete_position(id: String) -> Result<(), String>

   // ✅ 获取持仓统计
   #[tauri::command]
   pub async fn get_position_stats(code: String) -> Result<PositionStats, String>

   // ✅ 获取组合汇总
   #[tauri::command]
   pub async fn get_portfolio_summary(portfolio: String) -> Result<PortfolioSummary, String>

   // ✅ 获取所有组合汇总
   #[tauri::command]
   pub async fn get_all_portfolio_summaries() -> Result<Vec<PortfolioSummary>, String>
   ```

#### ⏳ 可进一步优化的地方

1. **错误处理** - 可补充更详细的错误类型
2. **数据库连接池** - 目前每次都创建新连接，可优化为连接池
3. **单元测试** - 添加 Rust 单元测试覆盖

---

## 四、前端组件优化（React）

### 优化状态：⏳ 需要完成

#### 待优化项

1. **usePositions Hook 需要更新** - 确保适配后端新 API
2. **前端类型定义需要分离** - 将存储类型和展示类型分开
3. **新增 SellPositionForm 组件** - 平仓功能的独立表单

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

## 六、剩余优化任务

### 已完成 ✅ （后端 + 基础设施）
- [x] **阶段 1: 数据库迁移** - 表结构优化、索引创建
- [x] **阶段 2: 后端重构** - 模块化架构、错误处理、数据库操作封装

### 待完成 ⏳ （前端适配）
- [ ] **阶段 3: 前端适配** （2-3天）
  - [ ] 更新 `src/lib/types.ts`（分离存储类型和展示类型）
  - [ ] 更新 `src/lib/db.ts`（新的 API 接口）
  - [ ] 重写 `src/hooks/usePositions.ts`（适配新 API）
  - [ ] 更新 `src/components/BuyPositionForm.tsx`
  - [ ] 新增 `src/components/SellPositionForm.tsx`（平仓表单）
  - [ ] 更新其他相关组件

- [ ] **阶段 4: 测试** （1 天）
  - [ ] 手动测试买入功能
  - [ ] 手动测试平仓功能
  - [ ] 手动测试删除功能
  - [ ] 集成测试

**剩余工作时间：3-4 天**

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

---

## 八、文档更新记录

| 日期 | 更新内容 |
|------|---------|
| 2025-11-08 | 迁移后文档更新：反映已完成的后端优化，标记待完成的前端适配任务 |
| 2025-11-07 | 初始版本：代码优化建议 |
