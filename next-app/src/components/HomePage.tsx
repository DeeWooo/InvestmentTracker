"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import PositionList from './PositionList';
import Portfolio from './Portfolio';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('positions');

  const portfolio = {
    totalValue: 1234567,
    totalCost: 1000000,
    totalPnl: 234567,
    totalPnlPercentage: 23.46,
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
          <Portfolio data={portfolio} />
        )}
      </div>
    </div>
  );
}
