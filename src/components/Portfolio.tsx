"use client";

import { useState } from "react";
import { BuyPositionForm } from "./BuyPositionForm";
import { Button } from "./ui/button";
import { CreatePositionRequest } from "@/lib/types";
import { usePositions } from "@/hooks/usePositions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";

export default function Portfolio() {
  const [showBuyForm, setShowBuyForm] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState<string | null>(null);

  const {
    positions,
    isLoading: positionsLoading,
    error: positionsError,
    refreshPositions,
    buyPosition,
  } = usePositions();

  // 获取所有投资组合列表
  const portfolioList = positions
    ? [...new Set(positions.map((p) => p.portfolio))]
    : [];

  // 筛选持仓
  const filteredPositions = positions
    ? positions.filter(
        (p) => !selectedPortfolio || p.portfolio === selectedPortfolio
      )
    : [];

  // 计算投资组合统计
  const portfolioStats = selectedPortfolio
    ? {
        totalCost: filteredPositions.reduce(
          (sum, p) => sum + p.buy_price * p.quantity,
          0
        ),
        totalQuantity: filteredPositions.reduce((sum, p) => sum + p.quantity, 0),
        activePositions: filteredPositions.filter(
          (p) => p.status === "POSITION"
        ),
      }
    : null;

  const handleSavePosition = async (data: CreatePositionRequest) => {
    try {
      await buyPosition(data);
      setShowBuyForm(false);
      await refreshPositions();
      alert("持仓添加成功！");
    } catch (error) {
      console.error("保存持仓失败:", error);
      const errorMessage =
        error instanceof Error ? error.message : "未知错误";
      alert(`保存失败: ${errorMessage}`);
    }
  };

  if (positionsLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Spinner />
        <p className="mt-4 text-gray-500">加载投资组合数据中...</p>
      </div>
    );
  }

  if (positionsError) {
    return (
      <div className="p-4 text-red-500 border border-red-200 rounded-md">
        <p>加载数据时出错：</p>
        <p>{typeof positionsError === "string" ? positionsError : "未知错误"}</p>
        <div className="mt-4">
          <Button onClick={refreshPositions}>重新加载</Button>
        </div>
      </div>
    );
  }

  if (!positions || positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-gray-500 mb-4">暂无投资组合数据</p>
        <Button onClick={() => setShowBuyForm(true)}>添加持仓</Button>
        {showBuyForm && (
          <div className="mt-4 w-full max-w-md">
            <BuyPositionForm onBuy={handleSavePosition} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 过滤和控制栏 */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <select
            value={selectedPortfolio || ""}
            onChange={(e) =>
              setSelectedPortfolio(e.target.value || null)
            }
            className="flex-1 px-3 py-2 border rounded"
          >
            <option value="">所有投资组合</option>
            {portfolioList.map((portfolio) => (
              <option key={portfolio} value={portfolio}>
                {portfolio}
              </option>
            ))}
          </select>

          <Button
            variant="primary"
            onClick={() => setShowBuyForm(!showBuyForm)}
          >
            {showBuyForm ? "关闭" : "添加持仓"}
          </Button>
        </div>

        {showBuyForm && (
          <div className="p-4 border rounded-lg bg-gray-50">
            <BuyPositionForm onBuy={handleSavePosition} />
          </div>
        )}
      </div>

      {/* 投资组合统计 */}
      {portfolioStats && (
        <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-600">总持仓成本</p>
            <p className="text-lg font-bold">¥{portfolioStats.totalCost.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">总持仓数量</p>
            <p className="text-lg font-bold">{portfolioStats.totalQuantity}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">活跃持仓</p>
            <p className="text-lg font-bold">
              {portfolioStats.activePositions.length}
            </p>
          </div>
        </div>
      )}

      {/* 持仓列表 */}
      {filteredPositions.length === 0 ? (
        <p className="text-center text-gray-500 py-8">
          {selectedPortfolio
            ? `${selectedPortfolio} 没有持仓`
            : "没有任何持仓"}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>代码</TableHead>
              <TableHead>名称</TableHead>
              <TableHead>数量</TableHead>
              <TableHead>买入价格</TableHead>
              <TableHead>成本</TableHead>
              <TableHead>买入日期</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>投资组合</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPositions.map((position) => (
              <TableRow key={position.id}>
                <TableCell>{position.code}</TableCell>
                <TableCell>{position.name}</TableCell>
                <TableCell>{position.quantity}</TableCell>
                <TableCell>¥{position.buy_price.toFixed(2)}</TableCell>
                <TableCell>¥{(position.buy_price * position.quantity).toFixed(2)}</TableCell>
                <TableCell>{position.buy_date}</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      position.status === "POSITION"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {position.status === "POSITION" ? "持仓中" : "已平仓"}
                  </span>
                </TableCell>
                <TableCell>{position.portfolio}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
