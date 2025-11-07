import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ExtendedPosition, PortfolioSummary } from "@/lib/types";
import { db } from "@/lib/db";

// 扩展的投资组合摘要信息
interface ExtendedPortfolioSummary extends PortfolioSummary {
  positions: ExtendedPosition[];
}

// 定义 Rust 端返回的数据结构
interface RustPortfolioSummary {
  portfolio: string;
  total_cost: number;
  total_value: number;
  pnl: number;
  pnl_percentage: number;
  positions: unknown[]; // 我们不使用这个字段
}

export function usePortfolio() {
  const [data, setData] = useState<ExtendedPortfolioSummary[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // 获取投资组合概要信息
        const rawSummaries = await invoke<RustPortfolioSummary[]>(
          "get_portfolio_summary"
        );

        // 将后端的snake_case转换为前端的camelCase
        const summaries = rawSummaries.map((summary) => ({
          portfolio: summary.portfolio,
          totalCost: summary.total_cost,
          totalValue: summary.total_value,
          pnl: summary.pnl,
          pnlPercentage: summary.pnl_percentage,
          // positions属性在后续计算中添加
        })) as PortfolioSummary[];

        // 获取所有持仓
        const positions = await db.getPositions();

        // 计算扩展信息
        const extendedSummaries = await Promise.all(
          summaries.map(async (summary) => {
            // 获取该投资组合下的所有持仓
            const portfolioPositions = positions.filter(
              (pos) => pos.portfolio === summary.portfolio
            );

            // 设置默认的单标满仓金额
            const maxPositionAmount = 50000;

            // 计算扩展的持仓信息
            const extendedPositions = portfolioPositions.map((position) => {
              // 计算当前仓位和成本仓位
              const totalValue = summary.totalValue || 0;
              const totalCost = summary.totalCost || 0;

              const current_position =
                totalValue > 0
                  ? (position.current_price * position.quantity) / totalValue
                  : 0;

              const cost_position =
                totalCost > 0
                  ? (position.buy_price * position.quantity) / totalCost
                  : 0;

              return {
                ...position,
                current_position,
                cost_position,
              };
            });

            // 返回扩展的投资组合摘要
            return {
              ...summary,
              maxPositionAmount,
              positions: extendedPositions,
            };
          })
        );

        setData(extendedSummaries);
      } catch (err) {
        console.error("Error fetching portfolio data:", err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // 设置刷新间隔
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  return { data, isLoading, error };
}
