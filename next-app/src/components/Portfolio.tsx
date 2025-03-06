import { useState, useEffect } from "react";
import { BuyPositionForm } from "./BuyPositionForm";
import { Button } from "./ui/button";
import { Position, Portfolio as PortfolioType } from "@/lib/types";
import "@/styles/portfolio-reference.css";
import React from "react";
import { usePositions } from "@/hooks/usePositions";
import {
  buildPortfoliosFromPositions,
  ensureTransactions,
} from "@/lib/portfolioUtils";

export default function Portfolio() {
  const [portfolios, setPortfolios] = useState<PortfolioType[]>([]);
  const [showBuyForm, setShowBuyForm] = useState(false);
  const [searchCode, setSearchCode] = useState("");
  const [searchName, setSearchName] = useState("");
  const [selectedPortfolio, setSelectedPortfolio] = useState<string | null>(
    null
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    positions,
    isLoading: positionsLoading,
    error: positionsError,
    refreshPositions,
    buyPosition,
  } = usePositions();

  const availablePortfolios =
    portfolios.length > 0
      ? [...new Set(portfolios.map((p) => p.portfolio))]
      : [
          "RMBETF",
          "北上资金",
          "主观持仓",
          "非RMB",
          "豆瓜",
          "peg策略",
          "白马成长策略",
        ];

  useEffect(() => {
    if (positions && Array.isArray(positions) && positions.length > 0) {
      const positionsWithTransactions = ensureTransactions(positions);
      const newPortfolios = buildPortfoliosFromPositions(
        positionsWithTransactions
      );
      setPortfolios(newPortfolios);
    }
  }, [positions]);

  const handleRefreshQuote = async () => {
    try {
      setIsRefreshing(true);
      await refreshPositions();
    } catch (error) {
      console.error("刷新行情失败:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredPortfolios = portfolios.filter((portfolio) => {
    if (selectedPortfolio && portfolio.portfolio !== selectedPortfolio) {
      return false;
    }
    return true;
  });

  const handleSavePosition = async (position: Position) => {
    try {
      await buyPosition(position);
      setShowBuyForm(false);
      await refreshPositions();
    } catch (error) {
      console.error("保存持仓失败:", error);
    }
  };

  // 添加一个函数用于打印调试信息
  const logTransactions = (position: Position) => {
    console.log(
      `Position ${position.code} transactions:`,
      position.transactions
    );
    return position.transactions && position.transactions.length > 0;
  };

  if (positionsLoading) return <div className="loading-spinner">加载中...</div>;
  if (positionsError)
    return (
      <div className="error-message">
        加载失败，请重试: {positionsError.message}
      </div>
    );
  if (!portfolios || portfolios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-gray-500 mb-4">暂无投资组合数据</p>
        <Button onClick={() => setShowBuyForm(true)}>添加持仓</Button>
        {showBuyForm && <BuyPositionForm onBuy={handleSavePosition} />}
      </div>
    );
  }

  return (
    <div className="portfolio-container">
      <div className="filter-area">
        <div className="grid grid-cols-3 gap-4">
          <div className="filter-item">
            <label className="block text-sm mb-1">证券代码：</label>
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="输入证券代码"
            />
          </div>

          <div className="filter-item">
            <label className="block text-sm mb-1">证券名称：</label>
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="输入证券名称"
            />
          </div>

          <div className="filter-item">
            <label className="block text-sm mb-1">投资组合：</label>
            <select
              value={selectedPortfolio || ""}
              onChange={(e) => setSelectedPortfolio(e.target.value || null)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">全部</option>
              {availablePortfolios.map((portfolio) => (
                <option key={portfolio} value={portfolio}>
                  {portfolio}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex space-x-2">
          <Button
            variant="primary"
            onClick={() => setShowBuyForm(!showBuyForm)}
          >
            开仓/买入
          </Button>

          {process.env.NODE_ENV !== "production" && (
            <Button
              variant="outline"
              onClick={() => {
                console.log("当前持仓数据:", positions);
                console.log("当前投资组合数据:", portfolios);
              }}
            >
              调试数据
            </Button>
          )}
        </div>
      </div>

      {filteredPortfolios.map((portfolio) => (
        <table key={portfolio.portfolio} className="portfolio-table">
          <thead>
            <tr className="portfolio-section">
              <th colSpan={8}>投资组合：{portfolio.portfolio}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="portfolio-summary-row">
              <td className="text-cell">
                总持仓成本: {portfolio.totalCost.toFixed(2)}
              </td>
              <td className="text-cell">
                单标满仓金额: {portfolio.maxPositionAmount}
              </td>
              <td
                className={
                  portfolio.pnl >= 0 ? "profit number-cell" : "loss number-cell"
                }
              >
                总盈亏: {portfolio.pnl.toFixed(2)}
              </td>
              <td
                className={
                  portfolio.pnlPercentage >= 0
                    ? "profit number-cell"
                    : "loss number-cell"
                }
              >
                总盈亏比: {(portfolio.pnlPercentage * 100).toFixed(2)}%
              </td>
              <td colSpan={4}></td>
            </tr>

            {portfolio.positions
              .filter((position) => {
                if (
                  searchCode &&
                  !position.code
                    .toLowerCase()
                    .includes(searchCode.toLowerCase())
                ) {
                  return false;
                }
                if (
                  searchName &&
                  !position.name
                    .toLowerCase()
                    .includes(searchName.toLowerCase())
                ) {
                  return false;
                }
                return true;
              })
              .map((position, index) => {
                // 添加调试日志
                console.log(
                  `渲染持仓 ${position.code}, 有交易记录: ${
                    position.transactions?.length || 0
                  }条`
                );

                return (
                  <React.Fragment key={position.code}>
                    <tr
                      className={`product-row ${
                        index % 2 === 0
                          ? "product-group-even"
                          : "product-group-odd"
                      }`}
                    >
                      <td>
                        <div className="product-code">{position.code}</div>
                        <div className="product-name">{position.name}</div>
                      </td>
                      <td className="number-cell">
                        当前仓位: {position.current_position?.toFixed(6)}
                      </td>
                      <td className="number-cell">
                        成本仓位: {position.cost_position?.toFixed(6)}
                      </td>
                      <td className="number-cell">
                        当前价格: {position.current_price.toFixed(4)}
                      </td>
                      <td
                        className={
                          position.pnl >= 0
                            ? "profit number-cell"
                            : "loss number-cell"
                        }
                      >
                        盈亏: {position.pnl.toFixed(2)}
                      </td>
                      <td
                        className={
                          position.pnl_percentage >= 0
                            ? "profit number-cell"
                            : "loss number-cell"
                        }
                      >
                        盈亏比: {(position.pnl_percentage * 100).toFixed(2)}%
                      </td>
                      <td className="text-cell suggestion-range">
                        建议买入区间(-10%): &lt;
                        {(position.buy_price * 0.9).toFixed(3)}
                      </td>
                      <td className="text-cell suggestion-range">
                        建议卖出区间(10%): &gt;
                        {(position.buy_price * 1.1).toFixed(3)}
                      </td>
                    </tr>

                    <tr
                      className={
                        index % 2 === 0
                          ? "product-group-even"
                          : "product-group-odd"
                      }
                    >
                      <td colSpan={8} className="pt-0 pb-3">
                        <div className="transaction-table-wrapper">
                          {position.transactions &&
                          position.transactions.length > 0 ? (
                            <div className="transaction-table">
                              {/* 允许任意数量的交易记录自动换行 */}

                              {/* 行标题 */}
                              <div className="row-title">属性 \\ 日期</div>

                              {/* 日期头部行 */}
                              {position.transactions.map((transaction, idx) => (
                                <div key={`date-${idx}`} className="date-title">
                                  {transaction.date}
                                </div>
                              ))}

                              {/* 买入价格行 */}
                              <div className="attr-title">买入价格</div>
                              {position.transactions.map((transaction, idx) => (
                                <div
                                  key={`price-${idx}`}
                                  className="data-cell number-cell"
                                >
                                  {transaction.price.toFixed(3)}
                                </div>
                              ))}

                              {/* 数量行 */}
                              <div className="attr-title">数量</div>
                              {position.transactions.map((transaction, idx) => (
                                <div
                                  key={`quantity-${idx}`}
                                  className="data-cell number-cell"
                                >
                                  {transaction.quantity}
                                </div>
                              ))}

                              {/* 盈亏行 */}
                              <div className="attr-title">盈亏</div>
                              {position.transactions.map((transaction, idx) => (
                                <div
                                  key={`pnl-${idx}`}
                                  className={`data-cell ${
                                    transaction.pnl >= 0 ? "profit" : "loss"
                                  } number-cell`}
                                >
                                  {transaction.pnl.toFixed(2)}
                                </div>
                              ))}

                              {/* 盈亏比行 */}
                              <div className="attr-title">盈亏比</div>
                              {position.transactions.map((transaction, idx) => (
                                <div
                                  key={`pnl-pct-${idx}`}
                                  className={`data-cell ${
                                    transaction.pnl_percentage >= 0
                                      ? "profit"
                                      : "loss"
                                  } number-cell`}
                                >
                                  {(transaction.pnl_percentage * 100).toFixed(
                                    2
                                  )}
                                  %
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="no-transactions-message">
                              没有交易记录
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
          </tbody>
        </table>
      ))}

      <div
        className={`refresh-button ${isRefreshing ? "refreshing" : ""}`}
        onClick={handleRefreshQuote}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 4v6h6" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      </div>
    </div>
  );
}
