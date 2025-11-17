import { invoke } from "@tauri-apps/api/core";
import {
  Position,
  CreatePositionRequest,
  ClosePositionRequest,
  ReducePositionRequest,
  PortfolioSummary,
  PositionStats,
  PortfolioProfitLoss,
  ClosedTradesSummary
} from "@/lib/types";

// Tauri 错误对象类型定义
interface TauriError {
  message?: string;
  display?: string;
  error?: string;
  code?: string;
}

export const db = {
  // 保存新的持仓记录
  async savePosition(request: CreatePositionRequest): Promise<Position> {
    if (typeof window === "undefined") {
      throw new Error("savePosition can only be called in the browser");
    }

    try {
      console.log("Saving position to database:", request);
      const result = await invoke<Position>("save_position", { request });

      if (!result) {
        throw new Error("保存失败：服务器未返回数据");
      }

      console.log("Save position result:", result);
      return result;
    } catch (err) {
      console.error("Database save error:", err);
      throw new Error(err instanceof Error ? err.message : "保存持仓数据失败");
    }
  },

  // 获取当前持仓
  async getPositions(): Promise<Position[]> {
    if (typeof window === "undefined") {
      throw new Error("getPositions can only be called in the browser");
    }

    try {
      const positions = await invoke<Position[]>("get_positions");

      if (!Array.isArray(positions)) {
        throw new Error("获取数据格式错误");
      }

      console.log("Retrieved positions:", positions);
      return positions;
    } catch (err) {
      // 改进错误处理，更好地显示错误信息
      // Tauri 2 会将错误序列化为包含 message, display, code 的对象
      let errorMessage = "获取持仓数据失败";
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      } else if (err && typeof err === "object") {
        // 尝试从错误对象中提取消息
        const errObj = err as TauriError;
        // Tauri 2 错误对象可能包含 message 或 display 字段
        if (errObj.message) {
          errorMessage = errObj.message;
        } else if (errObj.display) {
          errorMessage = errObj.display;
        } else if (errObj.error) {
          errorMessage = errObj.error;
        } else {
          // 尝试序列化整个错误对象
          try {
            errorMessage = JSON.stringify(err, null, 2);
          } catch {
            errorMessage = String(err);
          }
        }
      }
      
      console.error("Database get error:", {
        error: err,
        message: errorMessage,
        type: typeof err,
        stringified: JSON.stringify(err, null, 2)
      });
      
      throw new Error(errorMessage);
    }
  },

  // 获取指定代码的所有持仓记录（包括历史记录）
  async getPositionRecords(code: string): Promise<Position[]> {
    if (typeof window === "undefined") {
      throw new Error("getPositionRecords can only be called in the browser");
    }

    try {
      const records = await invoke<Position[]>("get_position_records", { code });
      return records || [];
    } catch (err) {
      console.error("Get position records error:", err);
      throw new Error(err instanceof Error ? err.message : "获取持仓记录失败");
    }
  },

  // 获取所有持仓代码（去重）
  async getCodesInPosition(): Promise<string[]> {
    if (typeof window === "undefined") {
      throw new Error("getCodesInPosition can only be called in the browser");
    }

    try {
      const codes = await invoke<string[]>("get_codes_in_position");
      return codes || [];
    } catch (err) {
      console.error("Get codes error:", err);
      throw new Error(err instanceof Error ? err.message : "获取持仓代码失败");
    }
  },

  // 平仓（卖出）
  async closePosition(request: ClosePositionRequest): Promise<void> {
    if (typeof window === "undefined") {
      throw new Error("closePosition can only be called in the browser");
    }

    try {
      await invoke("close_position", { 
        id: request.id,
        sellPrice: request.sell_price,
        sellDate: request.sell_date
      });
      console.log("平仓成功:", request);
    } catch (err) {
      console.error("Close position error:", err);
      throw new Error(err instanceof Error ? err.message : "平仓失败");
    }
  },

  // 减仓（部分卖出）
  async reducePosition(request: ReducePositionRequest): Promise<void> {
    if (typeof window === "undefined") {
      throw new Error("reducePosition can only be called in the browser");
    }

    try {
      await invoke("reduce_position", { 
        id: request.id,
        reduceQuantity: request.reduce_quantity,
        sellPrice: request.sell_price,
        sellDate: request.sell_date
      });
      console.log("减仓成功:", request);
    } catch (err) {
      console.error("Reduce position error:", err);
      throw new Error(err instanceof Error ? err.message : "减仓失败");
    }
  },

  // 删除记录
  async deletePosition(id: string): Promise<void> {
    if (typeof window === "undefined") {
      throw new Error("deletePosition can only be called in the browser");
    }

    try {
      await invoke("delete_position", { id });
    } catch (err) {
      console.error("Delete position error:", err);
      throw new Error(err instanceof Error ? err.message : "删除持仓失败");
    }
  },

  // 获取持仓统计信息
  async getPositionStats(code: string): Promise<PositionStats> {
    if (typeof window === "undefined") {
      throw new Error("getPositionStats can only be called in the browser");
    }

    try {
      const stats = await invoke<PositionStats>("get_position_stats", { code });
      return stats;
    } catch (err) {
      console.error("Get position stats error:", err);
      throw new Error(err instanceof Error ? err.message : "获取持仓统计失败");
    }
  },

  // 获取投资组合汇总
  async getPortfolioSummary(portfolio: string): Promise<PortfolioSummary> {
    if (typeof window === "undefined") {
      throw new Error("getPortfolioSummary can only be called in the browser");
    }

    try {
      const summary = await invoke<PortfolioSummary>("get_portfolio_summary", { portfolio });
      return summary;
    } catch (err) {
      console.error("Get portfolio summary error:", err);
      throw new Error(err instanceof Error ? err.message : "获取组合汇总失败");
    }
  },

  // 获取所有投资组合汇总
  async getAllPortfolioSummaries(): Promise<PortfolioSummary[]> {
    if (typeof window === "undefined") {
      throw new Error("getAllPortfolioSummaries can only be called in the browser");
    }

    try {
      const summaries = await invoke<PortfolioSummary[]>("get_all_portfolio_summaries");
      return summaries || [];
    } catch (err) {
      console.error("Get all portfolio summaries error:", err);
      throw new Error(err instanceof Error ? err.message : "获取所有组合汇总失败");
    }
  },

  // 获取所有投资组合列表
  async getPortfolios(): Promise<string[]> {
    if (typeof window === "undefined") {
      throw new Error("getPortfolios can only be called in the browser");
    }

    try {
      const portfolios = await invoke<string[]>("get_portfolios");
      return portfolios || [];
    } catch (err) {
      console.error("Get portfolios error:", err);
      throw new Error(err instanceof Error ? err.message : "获取投资组合列表失败");
    }
  },

  // 获取指定投资组合中的所有持仓
  async getPortfolioPositions(portfolio: string): Promise<Position[]> {
    if (typeof window === "undefined") {
      throw new Error("getPortfolioPositions can only be called in the browser");
    }

    try {
      const positions = await invoke<Position[]>("get_portfolio_positions", { portfolio });
      return positions || [];
    } catch (err) {
      console.error("Get portfolio positions error:", err);
      throw new Error(err instanceof Error ? err.message : "获取组合持仓失败");
    }
  },

  // 重置数据库（仅用于测试）
  async resetDatabase(): Promise<void> {
    if (typeof window === "undefined") {
      throw new Error("resetDatabase can only be called in the browser");
    }

    try {
      await invoke("reset_database");
    } catch (err) {
      console.error("Database reset error:", err);
      throw new Error(err instanceof Error ? err.message : "重置数据库失败");
    }
  },

  // 获取所有投资组合的完整盈亏视图（优先使用实时价格）
  // 对应后端的 get_portfolio_profit_loss_view
  // @param useMock - 是否使用模拟数据（仅用于开发测试，默认为 false 优先使用实时价格）
  async getPortfolioProfitLossView(useMock: boolean = false): Promise<PortfolioProfitLoss[]> {
    if (typeof window === "undefined") {
      throw new Error("getPortfolioProfitLossView can only be called in the browser");
    }

    try {
      const portfolios = await invoke<PortfolioProfitLoss[]>(
        "get_portfolio_profit_loss_view",
        { use_mock: useMock }
      );

      if (!Array.isArray(portfolios)) {
        throw new Error("获取数据格式错误");
      }

      console.log("Retrieved portfolio profit loss view:", portfolios);
      return portfolios;
    } catch (err) {
      // 改进错误处理，更好地显示错误信息
      // Tauri 2 会将错误序列化为包含 message, display, code 的对象
      let errorMessage = "获取投资组合盈亏视图失败";
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      } else if (err && typeof err === "object") {
        // 尝试从错误对象中提取消息
        const errObj = err as TauriError;
        // Tauri 2 错误对象可能包含 message 或 display 字段
        if (errObj.message) {
          errorMessage = errObj.message;
        } else if (errObj.display) {
          errorMessage = errObj.display;
        } else if (errObj.error) {
          errorMessage = errObj.error;
        } else {
          // 尝试序列化整个错误对象
          try {
            errorMessage = JSON.stringify(err, null, 2);
          } catch {
            errorMessage = String(err);
          }
        }
      }
      
      console.error("Get portfolio profit loss view error:", {
        error: err,
        message: errorMessage,
        type: typeof err,
        stringified: JSON.stringify(err, null, 2)
      });
      
      throw new Error(errorMessage);
    }
  },

  // 获取已平仓交易统计
  async getClosedTradesSummary(): Promise<ClosedTradesSummary> {
    try {
      console.log("[DB API] 获取已平仓交易统计...");
      const result = await invoke<ClosedTradesSummary>(
        "get_closed_trades_summary",
        {}
      );

      if (!result || typeof result !== "object") {
        throw new Error("获取数据格式错误");
      }

      console.log(
        "[DB API] 获取已平仓交易统计成功，共",
        result.trades?.length || 0,
        "笔交易"
      );
      return result;
    } catch (err) {
      console.error("[DB API] 获取已平仓交易统计失败:", err);
      throw new Error(
        err instanceof Error ? err.message : "获取已平仓交易统计失败"
      );
    }
  },
};
