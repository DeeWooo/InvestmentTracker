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

export interface PortfolioData {
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPercentage: number;
  positions: Position[];
}
