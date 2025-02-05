import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Position } from "@/lib/types";
import { db } from "@/lib/db";

export function usePositions() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = async () => {
    try {
      setIsLoading(true);
      setError(null); // 重置错误状态

      // 使用 db.getPositions() 替代直接调用 invoke
      const data = await db.getPositions();
      console.log("Fetched positions:", data);

      if (!Array.isArray(data)) {
        throw new Error("Invalid data format received from server");
      }

      setPositions(data);
    } catch (err) {
      console.error("Error fetching positions:", err);
      setError(err instanceof Error ? err.message : "获取持仓数据失败");
      setPositions([]); // 发生错误时重置positions
    } finally {
      setIsLoading(false);
    }
  };

  const deletePosition = async (code: string) => {
    try {
      await invoke("delete_position", { code });
      await fetchPositions(); // 重新获取数据
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除持仓失败");
    }
  };

  const closePosition = async (code: string) => {
    try {
      await invoke("close_position", { code });
      await fetchPositions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "平仓失败");
    }
  };

  const partialClose = async (code: string, quantity: number) => {
    try {
      await invoke("partial_close_position", { code, quantity });
      await fetchPositions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "部分平仓失败");
    }
  };

  const buyPosition = async (position: Position) => {
    try {
      console.log("Saving position to database:", position);
      // 使用 db.savePosition 而不是直接 invoke
      const result = await db.savePosition(position);
      console.log("Save position result:", result);

      // 立即重新获取数据
      await fetchPositions();

      // 返回保存的结果
      return result;
    } catch (err) {
      console.error("Buy position error:", err);
      setError(err instanceof Error ? err.message : "买入失败");
      throw err;
    }
  };

  useEffect(() => {
    fetchPositions();

    // 每60秒刷新一次数据
    const intervalId = setInterval(fetchPositions, 60000);

    return () => clearInterval(intervalId);
  }, []);

  return {
    positions,
    isLoading,
    error,
    deletePosition,
    closePosition,
    partialClose,
    refreshPositions: fetchPositions,
    buyPosition,
  };
}
