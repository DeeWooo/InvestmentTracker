export interface Transaction {
  date: string;
  price: number;
  quantity: number;
  pnl: number;
  pnl_percentage: number;
}

// 数据库持仓记录 - 对应后端 Position 结构
export interface Position {
  id: string;               // UUID，唯一主键
  code: string;             // 股票代码
  name: string;             // 股票名称
  buy_price: number;        // 买入价格
  buy_date: string;         // 买入日期 (YYYY-MM-DD)
  quantity: number;         // 买入数量
  status: string;           // 状态：POSITION 或 CLOSE
  portfolio: string;        // 所属投资组合
}

// 创建持仓记录请求参数
export interface CreatePositionRequest {
  code: string;             // 股票代码
  name: string;             // 股票名称
  buy_price: number;        // 买入价格
  buy_date: string;         // 买入日期 (YYYY-MM-DD)
  quantity: number;         // 买入数量
  portfolio: string;        // 所属投资组合
}

// 持仓统计信息
export interface PositionStats {
  code: string;             // 股票代码
  name: string;             // 股票名称
  total_quantity: number;   // 总数量
  total_cost: number;       // 总成本
  avg_cost_price: number;   // 平均成本价
  position_count: number;   // 持仓记录数
}

// 盈亏信息
export interface PnL {
  current_value: number;    // 当前价值
  pnl: number;             // 盈亏金额
  pnl_percentage: number;  // 盈亏率（百分比）
}

// 投资组合汇总信息 - 对应后端 PortfolioSummary
export interface PortfolioSummary {
  portfolio: string;        // 投资组合名称
  total_cost: number;       // 总成本
  total_value: number;      // 当前价值（前端计算）
  pnl: number;             // 总盈亏（前端计算）
  pnl_percentage: number;  // 盈亏率（前端计算）
  positions: Position[];   // 所有持仓记录
}

// 兼容旧的 Portfolio 接口
export interface Portfolio {
  portfolio: string;
  totalCost: number;
  maxPositionAmount: number;
  pnl: number;
  pnlPercentage: number;
  positions: Position[];
}

// 兼容旧的 PortfolioData 接口
export interface PortfolioData {
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPercentage: number;
  positions: Position[];
}

// 扩展的持仓接口（用于前端显示计算字段）
export interface ExtendedPosition extends Position {
  current_price?: number;    // 当前价格（前端获取）
  pnl?: number;             // 盈亏（前端计算）
  pnl_percentage?: number;  // 盈亏率（前端计算）
  current_value?: number;   // 当前价值（前端计算）
  transactions?: Transaction[]; // 历史交易记录
}

// API 响应错误类型
export interface ApiError {
  message: string;
  type: string;
}

// ============= 新增：完整的盈亏视图类型 =============

// 实时行情
export interface RealQuote {
  code: string;              // 股票代码
  name: string;              // 股票名称
  real_price: number;        // 实时价格
}

// 单笔交易的盈亏计算
export interface PositionProfitLoss {
  id: string;                // 交易ID
  code: string;              // 股票代码
  name: string;              // 股票名称
  buy_date: string;          // 买入日期
  buy_price: number;         // 买入价格
  quantity: number;          // 买入数量
  real_price: number;        // 实时价格
  position_cost: number;     // 持仓成本（买入价格 × 数量）
  profit_loss: number;       // 盈亏金额（(实时价格 - 买入价格) × 数量）
  profit_loss_rate: number;  // 盈亏比（盈亏 / 成本）
  status: string;            // 状态
  portfolio: string;         // 投资组合
}

// 股票级汇总（某个投资组合中的某支股票）
export interface TargetProfitLoss {
  code: string;                          // 股票代码
  name: string;                          // 股票名称
  real_price: number;                    // 实时价格
  position_profit_losses: PositionProfitLoss[];  // 所有交易记录
  cost_position_rate: number;            // 成本仓位占比（总成本 / 满仓金额）
  current_position_rate: number;         // 当前仓位占比（当前价值 / 满仓金额）
  target_profit_loss: number;            // 该股票总盈亏
  target_profit_loss_rate: number;       // 该股票盈亏比
  recommended_buy_in_point: number;      // 建议买入点（最近买入价 × 0.9）
  recommended_sale_out_point: number;    // 建议卖出点（最近买入价 × 1.1）
}

// 投资组合级汇总
export interface PortfolioProfitLoss {
  portfolio: string;                     // 投资组合名称
  full_position: number;                 // 满仓金额
  target_profit_losses: TargetProfitLoss[];  // 该组合下所有股票的汇总
  sum_position_cost: number;             // 总持仓成本
  sum_profit_losses: number;             // 总盈亏
  sum_profit_losses_rate: number;        // 总盈亏比
}
