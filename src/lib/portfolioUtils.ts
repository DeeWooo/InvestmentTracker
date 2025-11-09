import { Position, Portfolio } from "@/lib/types";

// 将持仓数据转换为投资组合数据
// 注：新的 Portfolio 组件已采用简化的实现，这些函数已过时
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

    // 更新投资组合总成本
    portfolioMap[portfolioName].totalCost += positionCost;

    // 将持仓添加到投资组合中
    portfolioMap[portfolioName].positions.push(position);
  });

  return Object.values(portfolioMap);
}

// 添加一个工具函数，确保每个持仓都有基本属性
export function ensureTransactions(positions: Position[]): Position[] {
  // 新的数据结构不需要transaction字段，直接返回原数组
  return positions;
}
