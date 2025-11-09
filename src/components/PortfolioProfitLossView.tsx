"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { PortfolioProfitLoss, PositionProfitLoss } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";

export default function PortfolioProfitLossView() {
  const [portfolios, setPortfolios] = useState<PortfolioProfitLoss[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStocks, setSelectedStocks] = useState<Set<string>>(new Set());

  const toggleStock = (code: string) => {
    setSelectedStocks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(code)) {
        newSet.delete(code);
      } else {
        newSet.add(code);
      }
      return newSet;
    });
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // 使用模拟数据（useMock = true）
      const data = await db.getPortfolioProfitLossView(true);
      setPortfolios(data);
    } catch (err) {
      console.error("加载投资组合盈亏视图失败:", err);
      setError(err instanceof Error ? err.message : "加载数据失败");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 格式化货币
  const formatCurrency = (value: number) => {
    return `¥${value.toFixed(2)}`;
  };

  // 格式化百分比
  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  // 获取盈亏颜色样式
  const getPnLStyle = (value: number) => {
    if (value > 0) return "text-green-600 font-semibold";
    if (value < 0) return "text-red-600 font-semibold";
    return "text-gray-600";
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Spinner />
        <p className="mt-4 text-gray-500">加载投资组合盈亏数据中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 border border-red-200 rounded-md">
        <p>加载数据时出错：{error}</p>
        <div className="mt-4">
          <Button onClick={loadData}>重新加载</Button>
        </div>
      </div>
    );
  }

  if (!portfolios || portfolios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-gray-500 mb-4">暂无投资组合盈亏数据</p>
        <Button onClick={loadData}>刷新</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">投资组合盈亏视图</h1>
        <Button onClick={loadData} variant="outline">刷新数据</Button>
      </div>

      {portfolios.map((portfolio) => (
        <Card key={portfolio.portfolio} className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">{portfolio.portfolio}</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  满仓金额: {formatCurrency(portfolio.full_position)}
                </p>
              </div>
              <div className="text-right space-y-1">
                <div className="text-sm text-gray-600">总持仓成本</div>
                <div className="text-lg font-bold">
                  {formatCurrency(portfolio.sum_position_cost)}
                </div>
                <div className={`text-lg ${getPnLStyle(portfolio.sum_profit_losses)}`}>
                  {formatCurrency(portfolio.sum_profit_losses)} ({formatPercentage(portfolio.sum_profit_losses_rate)})
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <div className="grid gap-4">
              {portfolio.target_profit_losses.map((target) => (
                <div
                  key={target.code}
                  className="border-2 border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all cursor-pointer bg-white"
                  onClick={() => toggleStock(target.code)}
                >
                  {/* 第一行：股票代码名称 + 当前价格 */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-gray-100">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-1">
                        {target.code} - <span className="text-gray-600">{target.name}</span>
                      </h3>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-gray-500 text-sm">当前价</span>
                        <span className="text-3xl font-bold text-blue-600">{formatCurrency(target.real_price)}</span>
                      </div>
                    </div>
                    <div className="text-center bg-blue-50 px-4 py-2 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">交易笔数</div>
                      <div className="text-4xl font-bold text-blue-600">
                        {target.position_profit_losses.length}
                      </div>
                    </div>
                  </div>

                  {/* 第二行：成本仓位 / 当前仓位 / 盈亏 / 盈亏比 */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500 mb-2">成本仓位</div>
                      <div className="text-lg font-bold text-gray-800">{formatPercentage(target.cost_position_rate)}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500 mb-2">当前仓位</div>
                      <div className="text-lg font-bold text-gray-800">{formatPercentage(target.current_position_rate)}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500 mb-2">盈亏</div>
                      <div className={`text-lg font-bold ${getPnLStyle(target.target_profit_loss)}`}>
                        {formatCurrency(target.target_profit_loss)}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500 mb-2">盈亏比</div>
                      <div className={`text-lg font-bold ${getPnLStyle(target.target_profit_loss)}`}>
                        {formatPercentage(target.target_profit_loss_rate)}
                      </div>
                    </div>
                  </div>

                  {/* 第三行：建议买入点 / 建议卖出点 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <div className="text-xs text-gray-600 mb-1">建议买入点</div>
                      <div className="text-lg font-bold text-green-700">{formatCurrency(target.recommended_buy_in_point)}</div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <div className="text-xs text-gray-600 mb-1">建议卖出点</div>
                      <div className="text-lg font-bold text-red-700">{formatCurrency(target.recommended_sale_out_point)}</div>
                    </div>
                  </div>

                  {/* 展开的交易明细 - 横向滚动表格 */}
                  {selectedStocks.has(target.code) && (
                    <div className="mt-4 border-t pt-4">
                      <h4 className="font-semibold mb-3 text-gray-700">
                        交易明细 <span className="text-blue-600">(共{target.position_profit_losses.length}笔)</span>
                      </h4>

                      {/* 横向滚动容器 */}
                      <div className="overflow-x-auto -mx-4 px-4">
                        <div className="inline-flex gap-3 pb-3 min-w-full">
                          {target.position_profit_losses.map((position: PositionProfitLoss) => (
                            <div
                              key={position.id}
                              className="flex-shrink-0 border-2 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow w-48"
                            >
                              {/* 卡片头部 - 日期 */}
                              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-center py-2 rounded-t-lg">
                                {position.buy_date}
                              </div>

                              {/* 卡片内容 */}
                              <div className="p-3 space-y-2 text-sm">
                                {/* 买入价 */}
                                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                  <span className="text-gray-500">买入价</span>
                                  <span className="font-semibold text-gray-900">{formatCurrency(position.buy_price)}</span>
                                </div>

                                {/* 数量 */}
                                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                  <span className="text-gray-500">数量</span>
                                  <span className="font-semibold text-gray-900">{position.quantity}</span>
                                </div>

                                {/* 成本 */}
                                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                  <span className="text-gray-500">成本</span>
                                  <span className="font-semibold text-gray-900">{formatCurrency(position.position_cost)}</span>
                                </div>

                                {/* 盈亏（高亮区域） */}
                                <div className="mt-2 pt-2 border-t-2 border-gray-200">
                                  <div className="flex justify-between items-center py-1">
                                    <span className="text-gray-500 font-medium">盈亏</span>
                                    <span className={`font-bold text-base ${getPnLStyle(position.profit_loss)}`}>
                                      {formatCurrency(position.profit_loss)}
                                    </span>
                                  </div>

                                  {/* 盈亏比例 */}
                                  <div className="flex justify-between items-center py-1">
                                    <span className="text-gray-500 font-medium">盈亏比</span>
                                    <span className={`font-bold text-base ${getPnLStyle(position.profit_loss)}`}>
                                      {formatPercentage(position.profit_loss_rate)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 提示文字 */}
                      <div className="text-xs text-gray-400 mt-2 text-center">
                        ← 左右滑动查看更多交易 →
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
