import { invoke } from "@tauri-apps/api/core";
import { Position } from "@/lib/types";

export const db = {
  async savePosition(position: Position): Promise<Position> {
    if (typeof window === "undefined") {
      throw new Error("savePosition can only be called in the browser");
    }

    try {
      console.log("Saving position to database:", position);
      const result = await invoke<Position>("save_position", { position });

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
      console.error("Database get error:", err);
      throw new Error(err instanceof Error ? err.message : "获取持仓数据失败");
    }
  },

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
};
