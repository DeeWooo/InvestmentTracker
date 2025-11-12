"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import PositionList from './PositionList';
import Portfolio from './Portfolio';
import PortfolioProfitLossView from './PortfolioProfitLossView';
import { Spinner } from '@/components/ui/spinner';
import { db } from '@/lib/db';
import { PortfolioProfitLoss } from '@/lib/types';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('positions');
  const [portfolios, setPortfolios] = useState<PortfolioProfitLoss[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // 从后端获取完整的投资组合盈亏数据（包含实时价格）
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // 使用模拟数据模式获取盈亏视图
        const data = await db.getPortfolioProfitLossView(true);
        setPortfolios(data);
      } catch (err) {
        console.error('Error fetching portfolio data:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    
    // 每60秒刷新一次数据
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  // 计算所有投资组合的总成本
  const totalAssets = portfolios
    ? portfolios.reduce((sum, p) => sum + p.sum_position_cost, 0)
    : 0;

  // 计算所有投资组合的总盈亏
  const totalPnl = portfolios
    ? portfolios.reduce((sum, p) => sum + p.sum_profit_losses, 0)
    : 0;

  // 计算当前总价值（成本 + 盈亏）
  const totalValue = totalAssets + totalPnl;


  return (
    <div className="flex h-screen">
      {/* 左侧栏 */}
      <div className="w-64 bg-background border-r p-4">
        <div className="mb-6">
          <h2 className="text-lg font-bold">我的投资</h2>
          
          {/* 加载状态 */}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
              <Spinner className="w-4 h-4" />
              <span>加载中...</span>
            </div>
          )}
          
          {/* 错误状态 */}
          {error && (
            <p className="text-sm text-red-500 mt-2">
              加载失败
            </p>
          )}
          
          {/* 总资产显示 */}
          {!isLoading && !error && (
            <div className="space-y-1 mt-2">
              <p className="text-sm text-gray-500">
                总成本: ¥{totalAssets.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className={`text-sm font-medium ${totalPnl >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                总盈亏: {totalPnl >= 0 ? '+' : ''}¥{totalPnl.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-gray-700 font-semibold">
                当前价值: ¥{totalValue.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {portfolios && portfolios.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  {portfolios.length} 个投资组合
                </p>
              )}
            </div>
          )}
        </div>
        
        <nav className="space-y-2">
          <Button
            variant={activeTab === 'positions' ? 'primary' : 'outline'}
            className="w-full justify-start"
            onClick={() => setActiveTab('positions')}
          >
            持仓列表
          </Button>
          <Button
            variant={activeTab === 'portfolio' ? 'primary' : 'outline'}
            className="w-full justify-start"
            onClick={() => setActiveTab('portfolio')}
          >
            投资组合
          </Button>
          <Button
            variant={activeTab === 'profitloss' ? 'primary' : 'outline'}
            className="w-full justify-start"
            onClick={() => setActiveTab('profitloss')}
          >
            盈亏视图
          </Button>
        </nav>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'positions' && <PositionList />}
        {activeTab === 'portfolio' && <Portfolio />}
        {activeTab === 'profitloss' && <PortfolioProfitLossView />}
      </div>
    </div>
  );
}
