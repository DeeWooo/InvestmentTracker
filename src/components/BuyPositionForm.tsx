import { useState, useCallback, useEffect } from 'react';
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
import { invoke } from "@tauri-apps/api/core";

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
  currentPrice?: number; // 当前实时价格
}

interface StockInfo {
  code: string;
  name: string;
  price?: number | null;
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
  const [isFetchingName, setIsFetchingName] = useState(false);
  const [portfolios, setPortfolios] = useState<string[]>([]);

  // 获取现有的投资组合列表
  const fetchPortfolios = useCallback(async () => {
    try {
      const portfolioList: string[] = await invoke('get_portfolios');
      setPortfolios(portfolioList);
    } catch (error) {
      console.warn('获取投资组合列表失败:', error);
    }
  }, []);

  // 组件加载时获取投资组合列表
  useEffect(() => {
    fetchPortfolios();
  }, [fetchPortfolios]);

  // 自动获取股票名称和价格
  const fetchStockName = useCallback(async (code: string) => {
    if (!code || code.length < 6) return;

    setIsFetchingName(true);
    try {
      const result: StockInfo = await invoke('fetch_stock_name', { code });
      setFormData(prev => ({
        ...prev,
        name: result.name || code,
        currentPrice: result.price || undefined
      }));
    } catch (error) {
      console.warn('获取股票信息失败:', error);
      // 失败时保持使用代码作为名称
      setFormData(prev => ({ ...prev, name: code, currentPrice: undefined }));
    } finally {
      setIsFetchingName(false);
    }
  }, []);

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
              onChange={(e) => {
                const code = e.target.value;
                setFormData({
                  ...formData,
                  code,
                  name: code   // 先临时设置为代码
                });
                // 当输入完整代码时自动获取名称
                if (code.length >= 6) {
                  fetchStockName(code);
                }
              }}
              placeholder="例如: 600519 或 sh600519"
              required
            />
            {isFetchingName && (
              <p className="text-xs text-gray-500">正在获取股票信息...</p>
            )}
            {formData.name && formData.name !== formData.code && (
              <div className="space-y-1">
                <p className="text-xs text-green-600">✓ {formData.name}</p>
                {formData.currentPrice && (
                  <p className="text-xs text-blue-600">
                    当前价格: ¥{formData.currentPrice.toFixed(2)}
                  </p>
                )}
              </div>
            )}
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
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>
          <div className="grid w-full items-center gap-2">
            <Label htmlFor="portfolio">投资组合</Label>
            <div className="relative">
              <Input
                id="portfolio"
                name="portfolio"
                type="text"
                list="portfolio-list"
                value={formData.portfolio}
                onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
                placeholder="选择或输入投资组合名称"
                required
              />
              <datalist id="portfolio-list">
                {portfolios.map((portfolio) => (
                  <option key={portfolio} value={portfolio} />
                ))}
              </datalist>
            </div>
            <p className="text-xs text-gray-500">
              从现有组合中选择，或输入新的组合名称
            </p>
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