"use client";

import { useEffect, useState } from "react";
import { ClosedTradesSummary, ClosedTradesStatistics } from "@/lib/types";
import { db } from "@/lib/db";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export function ClosedTradesView() {
  const [summary, setSummary] = useState<ClosedTradesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await db.getClosedTradesSummary();
      setSummary(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "加载数据失败";
      setError(errorMsg);
      console.error("Failed to fetch closed trades:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">错误: {error}</p>
      </div>
    );
  }

  if (!summary || summary.trades.length === 0) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
        <p className="text-gray-600">暂无已平仓的交易记录</p>
      </div>
    );
  }

  const { trades, statistics } = summary;

  return (
    <div className="space-y-6">
      {/* 总统计卡片 */}
      <StatisticsCards stats={statistics} />

      {/* 已平仓交易表格 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">已平仓交易列表</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>股票</TableHead>
                <TableHead className="text-right">买入日期</TableHead>
                <TableHead className="text-right">买入价</TableHead>
                <TableHead className="text-right">卖出日期</TableHead>
                <TableHead className="text-right">卖出价</TableHead>
                <TableHead className="text-right">数量</TableHead>
                <TableHead className="text-right">盈亏金额</TableHead>
                <TableHead className="text-right">盈亏率</TableHead>
                <TableHead className="text-right">持有天数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell className="font-medium">
                    {trade.code} {trade.name}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {trade.buy_date}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    ¥{trade.buy_price.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {trade.sell_date}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    ¥{trade.sell_price.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {trade.quantity}
                  </TableCell>
                  <TableCell
                    className={`text-right text-sm font-medium ${
                      trade.profit_loss >= 0
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    ¥{trade.profit_loss.toFixed(2)}
                  </TableCell>
                  <TableCell
                    className={`text-right text-sm font-medium ${
                      trade.profit_loss_rate >= 0
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {(trade.profit_loss_rate * 100).toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {trade.holding_days}天
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

interface StatisticsCardsProps {
  stats: ClosedTradesStatistics;
}

function StatisticsCards({ stats }: StatisticsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* 总交易笔数 */}
      <Card className="p-4">
        <p className="text-sm text-gray-600 mb-1">总交易笔数</p>
        <p className="text-2xl font-bold">{stats.total_trades}</p>
      </Card>

      {/* 成功率 */}
      <Card className="p-4">
        <p className="text-sm text-gray-600 mb-1">成功率</p>
        <p className="text-2xl font-bold text-blue-600">
          {(stats.win_rate * 100).toFixed(1)}%
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {stats.profitable_trades} 盈 / {stats.loss_trades} 亏
        </p>
      </Card>

      {/* 总盈亏 */}
      <Card className="p-4">
        <p className="text-sm text-gray-600 mb-1">总盈亏</p>
        <p
          className={`text-2xl font-bold ${
            stats.total_profit_loss >= 0
              ? "text-red-600"
              : "text-green-600"
          }`}
        >
          ¥{stats.total_profit_loss.toFixed(2)}
        </p>
      </Card>

      {/* 平均盈亏率 */}
      <Card className="p-4">
        <p className="text-sm text-gray-600 mb-1">平均盈亏率</p>
        <p
          className={`text-2xl font-bold ${
            stats.average_profit_loss_rate >= 0
              ? "text-red-600"
              : "text-green-600"
          }`}
        >
          {(stats.average_profit_loss_rate * 100).toFixed(2)}%
        </p>
      </Card>

      {/* 最大盈利 */}
      <Card className="p-4">
        <p className="text-sm text-gray-600 mb-1">最大盈利</p>
        <p className="text-2xl font-bold text-red-600">
          ¥{Math.max(0, stats.max_profit).toFixed(2)}
        </p>
      </Card>

      {/* 最大亏损 */}
      <Card className="p-4">
        <p className="text-sm text-gray-600 mb-1">最大亏损</p>
        <p className="text-2xl font-bold text-green-600">
          ¥{Math.abs(Math.min(0, stats.max_loss)).toFixed(2)}
        </p>
      </Card>

      {/* 平均持有天数 */}
      <Card className="p-4">
        <p className="text-sm text-gray-600 mb-1">平均持有天数</p>
        <p className="text-2xl font-bold">
          {Math.round(stats.average_holding_days)}
        </p>
      </Card>

      {/* 占位符 */}
      <div className="hidden md:block"></div>
    </div>
  );
}
