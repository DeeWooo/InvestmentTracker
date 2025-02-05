import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Position } from "@/lib/types";

interface BuyPositionFormProps {
  onBuy: (position: Position) => Promise<void>;
}

interface FormData {
  symbol: string;
  code: string;
  name: string;
  quantity: string; // 改为quantity替代shares
  price: string;
  date: string;
  portfolio: string;
}

export function BuyPositionForm({ onBuy }: BuyPositionFormProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    symbol: '',
    code: '',
    name: '',
    quantity: '', // 改为quantity
    price: '',
    date: '',
    portfolio: 'default',
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      const position: Position = {
        symbol: formData.symbol,
        code: formData.code || formData.symbol,
        name: formData.name || formData.symbol,
        quantity: Number(formData.quantity),
        buy_price: Number(formData.price),
        buy_date: formData.date,
        portfolio: formData.portfolio,
        pnl: 0,
        pnl_percentage: 0,
        current_price: Number(formData.price),
        profit10: Number(formData.price) * 1.1,  // 添加这些计算
        profit20: Number(formData.price) * 1.2,
      };

      console.log('Attempting to submit position:', position);
      
      // 数据验证
      if (!position.code || !position.quantity || !position.buy_price || !position.buy_date) {
        throw new Error('请填写所有必需字段');
      }

      await onBuy(position);
      console.log('Position submitted successfully');
      setOpen(false);
      setFormData({
        symbol: '',
        code: '',
        name: '',
        quantity: '',
        price: '',
        date: '',
        portfolio: 'default',
      });
    } catch (error) {
      console.error('Failed to buy position:', error);
      alert(error instanceof Error ? error.message : '买入失败，请重试');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>买入新持仓</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>买入新持仓</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid w-full items-center gap-2">
            <Label htmlFor="symbol">股票代码</Label>
            <Input
              id="symbol"
              name="symbol"
              value={formData.symbol}
              onChange={(e) => setFormData({ 
                ...formData, 
                symbol: e.target.value,
                code: e.target.value,  // 自动同步更新code
                name: e.target.value   // 自动同步更新name
              })}
              required
            />
          </div>
          <div className="grid w-full items-center gap-2">
            <Label htmlFor="quantity">数量</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              required
            />
          </div>
          <div className="grid w-full items-center gap-2">
            <Label htmlFor="price">买入价格</Label>
            <Input
              id="price"
              name="price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
            />
          </div>
          <div className="grid w-full items-center gap-2">
            <Label htmlFor="date">买入时间</Label>
            <Input
              id="date"
              name="date"
              type="datetime-local"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button type="submit">确认买入</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 