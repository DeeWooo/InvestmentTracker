import { useEffect, useState } from "react";
import { PortfolioSummary } from "@/lib/types";
import { db } from "@/lib/db";

// 扩展的投资组合摘要信息
interface ExtendedPortfolioSummary extends PortfolioSummary {
  maxPositionAmount?: number;
}

export function usePortfolio() {
  const [data, setData] = useState<ExtendedPortfolioSummary[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // 获取所有投资组合汇总
        const summaries = await db.getAllPortfolioSummaries();

        // 添加默认的单标满仓金额
        const extendedSummaries = summaries.map((summary) => ({
          ...summary,
          maxPositionAmount: 50000,
        }));

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
