import { BuyPositionForm } from './BuyPositionForm';
import { Position } from '@/lib/types';
import { db } from '@/lib/db';
// import { useState } from 'react';

interface PortfolioData {
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPercentage: number;
}

export default function Portfolio({ data }: { data: PortfolioData }) {
  const handleBuyPosition = async (position: {
    code: string;
    name: string;
    quantity: number;
    buyPrice: number;
    portfolio: string;
  }) => {
    try {
      const response = await fetch('/api/positions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(position),
      });

      if (!response.ok) {
        throw new Error('Failed to save position');
      }

      const savedPosition = await response.json();
      console.log('Saved position:', savedPosition);
      
      // 可以添加一个提示信息
      alert('持仓添加成功！');
      
    } catch (error) {
      console.error('Error buying position:', error);
      alert('保存失败，请重试');
    }
  };

  const handleAddPosition = async (position: Position) => {
    try {
      await db.savePosition(position);
      alert('持仓添加成功！');
      // TODO: 刷新持仓列表
    } catch (error) {
      console.error('Failed to save position:', error);
      alert('保存失败，请重试');
    }
  };

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          {/* <h1 className="text-2xl font-bold">投资组合</h1> */}
          <p className="text-gray-500">投资组合分析</p>
        </div>
        <BuyPositionForm onBuy={handleAddPosition} />
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg">
          <h3 className="text-sm text-gray-500">总市值</h3>
          <p className="text-xl font-bold">¥{data.totalValue.toLocaleString()}</p>
        </div>
        <div className="p-4 border rounded-lg">
          <h3 className="text-sm text-gray-500">总成本</h3>
          <p className="text-xl font-bold">¥{data.totalCost.toLocaleString()}</p>
        </div>
        <div className="p-4 border rounded-lg">
          <h3 className="text-sm text-gray-500">总盈亏</h3>
          <p className={`text-xl font-bold ${data.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            ¥{data.totalPnl.toLocaleString()}
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <h3 className="text-sm text-gray-500">收益率</h3>
          <p className={`text-xl font-bold ${data.totalPnlPercentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {data.totalPnlPercentage}%
          </p>
        </div>
      </div>
    </div>
  );
} 