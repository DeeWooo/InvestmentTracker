export interface Transaction {
  date: string;
  price: number;
  quantity: number;
  pnl: number;
  pnl_percentage: number;
}

export interface Position {
  symbol: string;
  code: string;
  name: string;
  quantity: number;
  buy_price: number;
  buy_date: string;
  portfolio: string;
  current_price: number;
  pnl: number;
  pnl_percentage: number;
  current_position?: number;
  cost_position?: number;
  profit10?: number;
  profit20?: number;
  transactions?: Transaction[];
}

export interface Portfolio {
  portfolio: string;
  totalCost: number;
  maxPositionAmount: number;
  pnl: number;
  pnlPercentage: number;
  positions: Position[];
}

export interface ExtendedPosition extends Position {
  // 任何可能的额外字段
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
