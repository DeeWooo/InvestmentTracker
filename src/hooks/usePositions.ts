import { useState, useEffect } from "react";
import { Position, CreatePositionRequest } from "@/lib/types";
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

  const deletePosition = async (id: string) => {
    try {
      await db.deletePosition(id);
      await fetchPositions(); // 重新获取数据
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除持仓失败");
      throw err; // 抛出错误以便调用者处理
    }
  };

  const closePosition = async (id: string) => {
    try {
      console.log('closePosition called with id:', id);
      console.log('Calling db.closePosition...');
      await db.closePosition(id);
      console.log('Close position successful');
      await fetchPositions();
    } catch (err) {
      console.error('closePosition error:', err);
      setError(err instanceof Error ? err.message : "平仓失败");
      throw err; // 抛出错误以便调用者处理
    }
  };

  // 部分平仓功能暂未实现
  // const partialClose = async (_code: string, _quantity: number) => {
  //   try {
  //     // 这个功能在新后端中暂时不实现，需要额外开发
  //     throw new Error("部分平仓功能暂未实现");
  //   } catch (err) {
  //     setError(err instanceof Error ? err.message : "部分平仓失败");
  //   }
  // };

  const buyPosition = async (request: CreatePositionRequest) => {
    try {
      console.log("Saving position to database:", request);
      // 使用 db.savePosition 而不是直接 invoke
      const result = await db.savePosition(request);
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
    refreshPositions: fetchPositions,
    buyPosition,
  };
}
