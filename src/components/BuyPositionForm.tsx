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
import { CreatePositionRequest } from "@/lib/types";

interface BuyPositionFormProps {
  onBuy: (request: CreatePositionRequest) => Promise<void>;
}

interface FormData {
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
      const request: CreatePositionRequest = {
        code: formData.code,
        name: formData.name || formData.code,
        quantity: Number(formData.quantity),
        buy_price: Number(formData.price),
        buy_date: formData.date,
        portfolio: formData.portfolio || 'default',
      };

      await onBuy(request);
      setOpen(false);
      setFormData({
        code: '',
        name: '',
        quantity: '',
        price: '',
        date: '',
        portfolio: 'default',
      });
    } catch (error) {
      console.error('Failed to save position:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>买入新持仓</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle>买入新持仓</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid w-full items-center gap-2">
            <Label htmlFor="code">股票代码</Label>
            <Input
              id="code"
              name="code"
              value={formData.code}
              onChange={(e) => setFormData({
                ...formData,
                code: e.target.value,
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
          <div className="grid w-full items-center gap-2">
            <Label htmlFor="portfolio">投资组合</Label>
            <Input
              id="portfolio"
              name="portfolio"
              type="text"
              value={formData.portfolio}
              onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
              placeholder="例如：default, 价值投资, 成长股"
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