import { useEffect, useState } from "react";
import { BuyPositionForm } from "./BuyPositionForm";
import { usePortfolio } from "@/hooks/usePortfolio";
import { ExtendedPosition, Position } from "@/lib/types";
import { Button } from "@/components/ui/button";
import "@/styles/portfolio-styles.css";

export default function Portfolio() {
  const { data: portfolios, isLoading, error } = usePortfolio();
  const [showBuyForm, setShowBuyForm] = useState(false);
  const [searchCode, setSearchCode] = useState("");
  const [searchName, setSearchName] = useState("");
  const [selectedPortfolio, setSelectedPortfolio] = useState<string | null>(
    null
  );

  // 获取可用的投资组合列表
  const availablePortfolios = portfolios
    ? Array.from(new Set(portfolios.map((p) => p.portfolio)))
    : [];

  useEffect(() => {
    // 如果有可用的投资组合，但没有选择任何一个，则默认选择第一个
    if (availablePortfolios.length > 0 && !selectedPortfolio) {
      setSelectedPortfolio(availablePortfolios[0]);
    }
  }, [availablePortfolios, selectedPortfolio]);

  // 修改为接收 Position 类型
  const handleSavePosition = async (position: Position) => {
    try {
      // 直接转发到 API
      const response = await fetch("/api/save-record", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: position.code,
          name: position.name,
          portfolio: position.portfolio,
          buyInPrice: position.buy_price,
          number: position.quantity,
        }),
      });
      const result = await response.json();
      alert(result);
    } catch (error) {
      console.error("保存失败", error);
      alert("保存失败！");
    }
  };

  // 筛选持仓
  const filterPositions = (positions: ExtendedPosition[] = []) => {
    return positions.filter(
      (pos) =>
        (searchCode === "" ||
          pos.code.toLowerCase().includes(searchCode.toLowerCase())) &&
        (searchName === "" ||
          pos.name.toLowerCase().includes(searchName.toLowerCase()))
    );
  };

  // 找到当前选择的投资组合
  const currentPortfolio = portfolios?.find(
    (p) => p.portfolio === selectedPortfolio
  );

  // 筛选该投资组合中的持仓
  const filteredPositions = currentPortfolio
    ? filterPositions(currentPortfolio.positions)
    : [];

  if (isLoading) return <div>加载中...</div>;
  if (error) return <div>加载失败，请重试: {error.message}</div>;
  if (!portfolios || portfolios.length === 0) {
    return (
      <div className="p-4 text-center">
        <p>暂无投资组合</p>
        <div className="mt-4">
          <div>
            <Button
              variant="primary"
              onClick={() => setShowBuyForm(!showBuyForm)}
            >
              开仓/买入
            </Button>
          </div>

          {showBuyForm && (
            <div className="mt-4">
              <BuyPositionForm onBuy={handleSavePosition} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="portfolio-container">
      {/* 筛选区域 */}
      <div className="filter-area mb-4">
        <div className="flex flex-wrap gap-4">
          <div className="search-input">
            <label className="mr-2">证券代码：</label>
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              className="px-2 py-1 border rounded"
            />
          </div>

          <div className="search-input">
            <label className="mr-2">证券名称：</label>
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="px-2 py-1 border rounded"
            />
          </div>

          <div className="portfolio-selector">
            <label className="mr-2">投资组合：</label>
            <select
              value={selectedPortfolio || ""}
              onChange={(e) => setSelectedPortfolio(e.target.value)}
              className="px-2 py-1 border rounded"
            >
              {availablePortfolios.map((portfolio) => (
                <option key={portfolio} value={portfolio}>
                  {portfolio}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <Button
            variant="primary"
            onClick={() => setShowBuyForm(!showBuyForm)}
          >
            开仓/买入
          </Button>

          {showBuyForm && (
            <div className="mt-4">
              <BuyPositionForm onBuy={handleSavePosition} />
            </div>
          )}
        </div>
      </div>

      {/* 投资组合信息 */}
      {currentPortfolio && (
        <div className="portfolio-summary mb-6 p-4 border rounded">
          <h2 className="text-xl font-bold mb-2">
            投资组合：{currentPortfolio.portfolio}
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p>总持仓成本: {(currentPortfolio.totalCost ?? 0).toFixed(6)}</p>
              <p>单标满仓金额: {currentPortfolio.maxPositionAmount || 50000}</p>
            </div>

            <div>
              <p
                className={
                  (currentPortfolio.pnl ?? 0) < 0
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                总盈亏：{(currentPortfolio.pnl ?? 0).toFixed(4)}
              </p>
              <p
                className={
                  (currentPortfolio.pnlPercentage ?? 0) < 0
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                总盈亏比: {(currentPortfolio.pnlPercentage ?? 0).toFixed(6)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 持仓列表 */}
      <div className="positions-container">
        {filteredPositions.map((position) => {
          // 计算建议买入卖出区间
          const buyRange = position.buy_price * 0.9;
          const sellRange = position.buy_price * 1.1;

          return (
            <div
              key={position.code}
              className="position-card mb-6 border rounded overflow-hidden"
            >
              <div className="bg-gray-100 p-2 border-b">
                <h3 className="font-bold">{position.code}</h3>
                <p>{position.name}</p>
              </div>

              <div className="flex flex-wrap">
                {/* 左侧：当前价格信息 */}
                <div className="w-1/6 p-4 border-r">
                  <p className="text-center text-gray-600">当前价格</p>
                  <p className="text-center text-xl font-bold">
                    {position.current_price.toFixed(4)}
                  </p>
                </div>

                {/* 中间：仓位和盈亏信息 */}
                <div className="w-1/2 p-4 border-r">
                  <p>
                    当前仓位:{" "}
                    {position.current_position?.toFixed(6) || "计算中..."}
                  </p>
                  <p>
                    成本仓位:{" "}
                    {position.cost_position?.toFixed(6) || "计算中..."}
                  </p>

                  <hr className="my-2" />

                  <p
                    className={
                      position.pnl < 0 ? "text-green-600" : "text-red-600"
                    }
                  >
                    盈亏: {position.pnl.toFixed(4)}
                  </p>
                  <p
                    className={
                      position.pnl_percentage < 0
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    盈亏比： {position.pnl_percentage.toFixed(6)}
                  </p>

                  <hr className="my-2" />

                  <p>建议买入区间(-10%)&lt;{buyRange.toFixed(3)}</p>
                  <p>建议卖出区间(10%)&gt;{sellRange.toFixed(3)}</p>
                </div>

                {/* 右侧：交易记录 - 这里将使用模拟数据 */}
                <div className="w-1/3 p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="p-1 border">买入日期</th>
                        <th className="p-1 border">买入价格</th>
                        <th className="p-1 border">数量</th>
                        <th className="p-1 border">盈亏</th>
                        <th className="p-1 border">盈亏比</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* 这里我们只有一条记录，实际情况中应该获取所有交易记录 */}
                      <tr>
                        <td className="p-1 border">{position.buy_date}</td>
                        <td className="p-1 border">
                          {position.buy_price.toFixed(2)}
                        </td>
                        <td className="p-1 border">{position.quantity}</td>
                        <td
                          className={`p-1 border ${
                            position.pnl < 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {position.pnl.toFixed(4)}
                        </td>
                        <td
                          className={`p-1 border ${
                            position.pnl_percentage < 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {position.pnl_percentage.toFixed(6)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 刷新按钮 */}
      <div
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg cursor-pointer"
        onClick={() => window.location.reload()}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </div>
    </div>
  );
}
