import { Position, Portfolio, Transaction } from "@/lib/types";

// 将持仓数据转换为投资组合数据
export function buildPortfoliosFromPositions(
  positions: Position[]
): Portfolio[] {
  // 按投资组合分组
  const portfolioMap: Record<string, Portfolio> = {};

  if (!positions || !Array.isArray(positions) || positions.length === 0) {
    return [];
  }

  positions.forEach((position) => {
    // 如果position没有portfolio属性，设置一个默认值
    const portfolioName = position.portfolio || "默认组合";

    // 如果这个投资组合还不存在于映射表中，初始化它
    if (!portfolioMap[portfolioName]) {
      portfolioMap[portfolioName] = {
        portfolio: portfolioName,
        totalCost: 0,
        maxPositionAmount: 50000, // 默认单标满仓金额
        pnl: 0,
        pnlPercentage: 0,
        positions: [],
      };
    }

    // 计算持仓成本
    const positionCost = position.buy_price * position.quantity;

    // 更新投资组合总成本和盈亏
    portfolioMap[portfolioName].totalCost += positionCost;
    portfolioMap[portfolioName].pnl += position.pnl || 0;

    // 确保position有transactions数组
    if (!position.transactions || !Array.isArray(position.transactions)) {
      // 如果没有交易记录，创建一个基本的交易记录
      position.transactions = [
        {
          date: position.buy_date,
          price: position.buy_price,
          quantity: position.quantity,
          pnl: position.pnl || 0,
          pnl_percentage: position.pnl_percentage || 0,
        },
      ];
    }

    // 将持仓添加到投资组合中
    portfolioMap[portfolioName].positions.push(position);
  });

  // 计算每个投资组合的盈亏比例
  Object.values(portfolioMap).forEach((portfolio) => {
    portfolio.pnlPercentage =
      portfolio.totalCost > 0 ? portfolio.pnl / portfolio.totalCost : 0;
  });

  return Object.values(portfolioMap);
}

// 添加一个工具函数，确保每个持仓都有交易记录
export function ensureTransactions(positions: Position[]): Position[] {
  return positions.map((position) => {
    if (!position.transactions || position.transactions.length === 0) {
      return {
        ...position,
        transactions: [
          {
            date: position.buy_date,
            price: position.buy_price,
            quantity: position.quantity,
            pnl: position.pnl || 0,
            pnl_percentage: position.pnl_percentage || 0,
          },
        ],
      };
    }
    return position;
  });
}
