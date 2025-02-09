import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Position } from "@/lib/types";

interface PortfolioSummary {
  portfolio: string;
  totalCost: number;
  totalValue: number;
  pnl: number;
  pnlPercentage: number;
  positions: Position[];
}

export function usePortfolio() {
  const [data, setData] = useState<PortfolioSummary[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await invoke<PortfolioSummary[]>("get_portfolio_summary");
        setData(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, isLoading, error };
}
