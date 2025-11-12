"use client";

import { useState } from "react";
import { Position, ClosePositionRequest } from "@/lib/types";
import { Button } from "@/components/ui/button";

interface SellPositionFormProps {
  position: Position;
  onSell: (data: ClosePositionRequest) => Promise<void>;
  onCancel: () => void;
}

export function SellPositionForm({ position, onSell, onCancel }: SellPositionFormProps) {
  const [sellPrice, setSellPrice] = useState('');
  const [sellDate, setSellDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 实时计算盈亏
  const profitLoss = sellPrice ? (parseFloat(sellPrice) - position.buy_price) * position.quantity : 0;
  const profitLossRate = position.buy_price > 0 && sellPrice
    ? (parseFloat(sellPrice) - position.buy_price) / position.buy_price
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 校验
    if (!sellPrice || parseFloat(sellPrice) <= 0) {
      alert('请输入有效的卖出价格');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSell({
        id: position.id,
        sell_price: parseFloat(sellPrice),
        sell_date: sellDate
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      {/* 标题部分 */}
      <div className="border-b pb-3">
        <h3 className="font-bold text-lg">平仓操作</h3>
        <p className="text-sm text-gray-600 mt-1">
          {position.name} ({position.code})
        </p>
        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
          <div>
            <span className="text-gray-500">持有数量：</span>
            <span className="font-medium">{position.quantity}股</span>
          </div>
          <div>
            <span className="text-gray-500">买入价：</span>
            <span className="font-medium">¥{position.buy_price.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-500">买入日期：</span>
            <span className="font-medium">{position.buy_date}</span>
          </div>
          <div>
            <span className="text-gray-500">当前价：</span>
            <span className="font-medium text-amber-600">¥{position.current_price?.toFixed(2) || '获取中...'}</span>
          </div>
        </div>
      </div>

      {/* 卖出价格 */}
      <div>
        <label className="block text-sm font-medium mb-1">
          卖出价格（元/股）<span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            step="0.01"
            value={sellPrice}
            onChange={(e) => setSellPrice(e.target.value)}
            placeholder="输入卖出价格"
            className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            autoFocus
          />
          {position.current_price && (
            <button
              type="button"
              onClick={() => setSellPrice(position.current_price!.toFixed(2))}
              className="px-3 py-2 text-sm bg-amber-100 text-amber-700 rounded hover:bg-amber-200 whitespace-nowrap"
              title="使用当前价格"
            >
              当前价
            </button>
          )}
        </div>
      </div>

      {/* 卖出日期 */}
      <div>
        <label className="block text-sm font-medium mb-1">
          卖出日期
        </label>
        <input
          type="date"
          value={sellDate}
          onChange={(e) => setSellDate(e.target.value)}
          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* 盈亏预览 */}
      {sellPrice && (
        <div className={`p-3 rounded ${profitLoss >= 0 ? 'bg-red-50' : 'bg-green-50'}`}>
          <p className="text-sm text-gray-600">预计盈亏</p>
          <p className={`text-2xl font-bold ${profitLoss >= 0 ? 'text-red-600' : 'text-green-600'}`}>
            {profitLoss >= 0 ? '+' : ''}¥{profitLoss.toFixed(2)}
          </p>
          <p className={`text-lg font-medium ${profitLoss >= 0 ? 'text-red-500' : 'text-green-500'}`}>
            {profitLoss >= 0 ? '+' : ''}{(profitLossRate * 100).toFixed(2)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {position.quantity}股 × (¥{sellPrice} - ¥{position.buy_price.toFixed(2)})
          </p>
        </div>
      )}

      {/* 提示信息 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
        <p className="text-sm text-yellow-800">
          ⚠️ 确认平仓后将卖出全部持仓（{position.quantity}股），此操作无法撤销
        </p>
      </div>

      {/* 按钮 */}
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1"
        >
          取消
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
        >
          {isSubmitting ? '处理中...' : '确认平仓'}
        </Button>
      </div>
    </form>
  );
}

