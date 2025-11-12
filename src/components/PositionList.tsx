import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useState, useEffect } from 'react';
import { Trash2, ArrowDownLeft, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePositions } from '@/hooks/usePositions';
import { Spinner } from '@/components/ui/spinner';
import { BuyPositionForm } from './BuyPositionForm';
import { ConfirmDialog } from './ConfirmDialog';
import { CreatePositionRequest, PositionProfitLoss } from '@/lib/types';
import { db } from '@/lib/db';

export default function PositionList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [positionPnLMap, setPositionPnLMap] = useState<Map<string, PositionProfitLoss>>(new Map());
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'close' | 'delete' | null;
    positionId: string | null;
  }>({
    open: false,
    type: null,
    positionId: null,
  });

  const {
    positions,
    isLoading,
    error: positionsError,
    deletePosition,
    closePosition,
    buyPosition,
    refreshPositions
  } = usePositions();

  console.log('PositionList rendered with:', {
    positions,
    isLoading,
    error: positionsError,
    positionsType: positions ? typeof positions : 'undefined',
    isArray: Array.isArray(positions),
  });

  // 获取盈亏比样式(盈亏比>10%时加粗)
  const getPnLRateStyle = (rate: number) => {
    const baseStyle = rate > 0 ? "text-red-600" : rate < 0 ? "text-green-600" : "text-gray-800";
    const isBold = Math.abs(rate) > 0.1; // 10%
    return isBold ? `${baseStyle} font-semibold` : baseStyle;
  };

  // 格式化货币
  const formatCurrency = (value: number) => {
    return `¥${value.toFixed(2)}`;
  };

  // 格式化百分比
  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  // 格式化日期(只显示年月日)
  const formatDate = (dateString: string) => {
    return dateString.split('T')[0]; // 只取日期部分(处理ISO格式)
  };

  // 加载盈亏数据
  useEffect(() => {
    const loadPnLData = async () => {
      try {
        const data = await db.getPortfolioProfitLossView(true);
        const pnlMap = new Map<string, PositionProfitLoss>();

        // 遍历所有投资组合的所有股票的所有持仓记录
        data.forEach(portfolio => {
          portfolio.target_profit_losses.forEach(target => {
            target.position_profit_losses.forEach(position => {
              pnlMap.set(position.id, position);
            });
          });
        });

        setPositionPnLMap(pnlMap);
      } catch (err) {
        console.error('Failed to load PnL data:', err);
      }
    };

    if (!isLoading && positions && positions.length > 0) {
      loadPnLData();
    }
  }, [positions, isLoading]);

  // 打开平仓确认对话框
  const handleClosePosition = (id: string) => {
    console.log('handleClosePosition called with id:', id);
    setConfirmDialog({
      open: true,
      type: 'close',
      positionId: id,
    });
  };

  // 打开删除确认对话框
  const handleDeletePosition = (id: string) => {
    console.log('handleDeletePosition called with id:', id);
    setConfirmDialog({
      open: true,
      type: 'delete',
      positionId: id,
    });
  };

  // 确认对话框的确认按钮处理
  const handleConfirm = async () => {
    if (!confirmDialog.positionId) return;

    try {
      if (confirmDialog.type === 'close') {
        console.log('Executing close position for:', confirmDialog.positionId);
        await closePosition(confirmDialog.positionId);
      } else if (confirmDialog.type === 'delete') {
        console.log('Executing delete position for:', confirmDialog.positionId);
        await deletePosition(confirmDialog.positionId);
      }
    } catch (err) {
      console.error('Failed to execute action:', err);
    } finally {
      setConfirmDialog({ open: false, type: null, positionId: null });
    }
  };

  // 取消对话框
  const handleCancel = () => {
    setConfirmDialog({ open: false, type: null, positionId: null });
  };

  const handleBuyPosition = async (data: CreatePositionRequest) => {
    try {
      console.log('Attempting to buy position:', data);
      const result = await buyPosition(data);
      console.log('Position bought successfully, result:', result);
      
      if (!result) {
        throw new Error('保存持仓失败：未收到服务器响应');
      }
      
      // 立即重新获取最新数据
      console.log('Refreshing positions after buy...');
      await refreshPositions();
      
      // 添加成功提示
      alert('持仓添加成功！');
      
    } catch (err) {
      console.error('Failed to buy position:', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : typeof err === 'string' 
          ? err 
          : '未知错误';
      alert(`买入失败: ${errorMessage}`);
    }
  };

  const hasPositions = Boolean(
    positions && 
    Array.isArray(positions) && 
    positions.length > 0
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Spinner />
        <p className="mt-4 text-gray-500">加载持仓数据中...</p>
      </div>
    );
  }

  if (positionsError) {
    return (
      <div className="p-4 text-red-500 border border-red-200 rounded-md">
        <p>加载数据时出错：</p>
        <p>{String(positionsError)}</p>
        <div className="mt-4">
          <BuyPositionForm onBuy={handleBuyPosition} />
        </div>
      </div>
    );
  }

  if (!hasPositions) {
    console.log('No positions found, showing empty state. Positions:', positions);
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">暂无持仓数据</p>
        <div className="mt-4">
          <BuyPositionForm onBuy={handleBuyPosition} />
        </div>
      </div>
    );
  }

  // 在 filteredPositions 之前添加日志
  console.log('Filtering positions:', {
    positions,
    searchQuery,
    positionsLength: positions?.length
  });

  const filteredPositions = (positions?.filter(
    (position) =>
      position?.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      position?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? []).sort((a, b) => {
    // 按盈亏比降序排列
    const pnlA = positionPnLMap.get(a.id);
    const pnlB = positionPnLMap.get(b.id);

    // 如果没有数据,保持原位置
    if (!pnlA && !pnlB) return 0;
    if (!pnlA) return 1;
    if (!pnlB) return -1;

    // 按盈亏比降序(高到低)
    return pnlB.profit_loss_rate - pnlA.profit_loss_rate;
  });

  return (
    <>
      {positionsError && (
        <div className="mb-4">
          <Button 
            variant="outline" 
            onClick={refreshPositions}
            className="w-full"
          >
            重新加载数据
          </Button>
        </div>
      )}
      <div className="mb-6">
        {/* <h1 className="text-2xl font-bold">持仓列表</h1> */}
        <p className="text-gray-500">实时更新你的持仓盈亏情况</p>
      </div>

      <div className="mb-4">
        <BuyPositionForm onBuy={handleBuyPosition} />
      </div>

      <div className="mb-4">
        <Input
          placeholder="搜索持仓..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>代码</TableHead>
            <TableHead>名称</TableHead>
            <TableHead>盈亏</TableHead>
            <TableHead>盈亏比</TableHead>
            <TableHead>数量</TableHead>
            <TableHead>当前价格</TableHead>
            <TableHead>买入价格</TableHead>
            <TableHead>盈10%</TableHead>
            <TableHead>盈20%</TableHead>
            <TableHead>买入日期</TableHead>
            <TableHead>投资组合</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPositions.map((position) => {
            const pnlData = positionPnLMap.get(position.id);
            return (
              <TableRow key={position.id}>
                <TableCell>{position.code}</TableCell>
                <TableCell>{position.name}</TableCell>
                <TableCell className={pnlData ? getPnLRateStyle(pnlData.profit_loss_rate) : ''}>
                  {pnlData ? formatCurrency(pnlData.profit_loss) : '待计算'}
                </TableCell>
                <TableCell className={pnlData ? getPnLRateStyle(pnlData.profit_loss_rate) : ''}>
                  {pnlData ? formatPercentage(pnlData.profit_loss_rate) : '待计算'}
                </TableCell>
                <TableCell>{position.quantity}</TableCell>
                <TableCell className="text-amber-500">{pnlData ? formatCurrency(pnlData.real_price) : '待获取'}</TableCell>
                <TableCell>{position.buy_price.toFixed(4)}</TableCell>
                <TableCell>{(position.buy_price * 1.1).toFixed(4)}</TableCell>
                <TableCell>{(position.buy_price * 1.2).toFixed(4)}</TableCell>
                <TableCell>{formatDate(position.buy_date)}</TableCell>
                <TableCell>{position.portfolio}</TableCell>
                <TableCell><div className="flex gap-2"><Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleClosePosition(position.id)}
                  ><ArrowDownLeft className="h-4 w-4 mr-1" />平仓</Button><Button
                    variant="outline"
                    size="sm"
                    disabled
                    title="部分卖出功能尚在开发中"
                    onClick={() => {
                      alert('部分卖出功能暂未实现');
                    }}
                  ><ArrowDown className="h-4 w-4 mr-1" />部分卖出</Button><Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeletePosition(position.id)}
                  ><Trash2 className="h-4 w-4 mr-1" />删除</Button></div></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={confirmDialog.open}
        title={
          confirmDialog.type === 'close'
            ? '确认平仓'
            : confirmDialog.type === 'delete'
            ? '确认删除'
            : ''
        }
        description={
          confirmDialog.type === 'close'
            ? '确认要平仓此持仓吗？平仓后该持仓将被标记为已平仓状态。'
            : confirmDialog.type === 'delete'
            ? '确认要删除此持仓记录吗？该操作无法撤销。'
            : ''
        }
        confirmText={
          confirmDialog.type === 'close' ? '平仓' : confirmDialog.type === 'delete' ? '删除' : '确认'
        }
        isDangerous={confirmDialog.type === 'delete'}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
} 