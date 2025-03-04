export interface Position {
  symbol: string;
  code: string;
  name: string;
  quantity: number;
  buy_price: number;
  buy_date: string;
  portfolio: string;
  pnl: number;
  pnl_percentage: number;
  current_price: number;
  profit10: number;
  profit20: number;
}

// 前端扩展类型，用于显示
export interface ExtendedPosition extends Position {
  current_position?: number;
  cost_position?: number;
}

export interface PortfolioData {
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPercentage: number;
  positions: Position[];
}

export interface PortfolioSummary {
  portfolio: string;
  totalCost: number;
  totalValue: number;
  pnl: number;
  pnlPercentage: number;
  maxPositionAmount?: number;
}
