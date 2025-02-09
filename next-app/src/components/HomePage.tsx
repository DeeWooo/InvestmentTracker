"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import PositionList from './PositionList';
import Portfolio from './Portfolio';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('positions');

  const portfolio = {
    name: "白马成长策略",
    totalCost: 73470.0,
    maxSinglePosition: 50000,
    totalPnl: -33879.0,
    totalPnlPercentage: -0.461127,
    totalValue: 73470.0 - 33879.0,
    positions: [
      {
        code: "sz000408",
        name: "藏格矿业(000408)",
        currentPrice: 32.24,
        currentPosition: 0.12896,
        costPosition: 0.1332,
        pnl: -212.0,
        pnlPercentage: -0.031832,
        buyRange: 28.485,
        sellRange: 34.815,
        transactions: [
          {
            date: "2022-08-19",
            price: 31.65,
            quantity: 100,
            pnl: 59.0,
            pnlPercentage: 0.018641
          },
          {
            date: "2022-07-27",
            price: 34.95,
            quantity: 100,
            pnl: -271.0,
            pnlPercentage: -0.077539
          }
        ]
      },
      // ... 其他标的 ...
    ]
  };


  return (
    <div className="flex h-screen">
      {/* 左侧栏 */}
      <div className="w-64 bg-background border-r p-4">
        <div className="mb-6">
          <h2 className="text-lg font-bold">我的投资</h2>
          <p className="text-sm text-gray-500">总资产: ¥{portfolio.totalValue.toLocaleString()}</p>
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
        </nav>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'positions' ? (
          <PositionList />
        ) : (
          <Portfolio />
        )}
      </div>
    </div>
  );
}
