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
import { Trash2, ArrowDownLeft, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePositions } from '@/hooks/usePositions';
import { Spinner } from '@/components/ui/spinner';
import { BuyPositionForm } from './BuyPositionForm';
import { ConfirmDialog } from './ConfirmDialog';
import { SellPositionForm } from './SellPositionForm';
import { ReducePositionForm } from './ReducePositionForm';
import { CreatePositionRequest, ClosePositionRequest, ReducePositionRequest, Position, PositionProfitLoss } from '@/lib/types';
import { db } from '@/lib/db';

interface PositionListProps {
  onDataChange?: () => void;
}

export default function PositionList({ onDataChange }: PositionListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [positionPnLMap, setPositionPnLMap] = useState<Map<string, PositionProfitLoss>>(new Map());
  
  // 删除确认对话框
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'delete' | null;
    positionId: string | null;
  }>({
    open: false,
    type: null,
    positionId: null,
  });

  // 卖出表单对话框
  const [sellDialog, setSellDialog] = useState<{
    open: boolean;
    position: Position | null;
  }>({
    open: false,
    position: null,
  });

  // 减仓表单对话框
  const [reduceDialog, setReduceDialog] = useState<{
    open: boolean;
    position: Position | null;
  }>({
    open: false,
    position: null,
  });

  const {
    positions,
    isLoading,
    error: positionsError,
    deletePosition,
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

  // 打开卖出表单对话框
  const handleOpenSellDialog = (position: Position) => {
    console.log('Opening sell dialog for position:', position);
    
    // 获取该持仓的实时价格
    const pnlData = positionPnLMap.get(position.id);
    
    // 将当前价格附加到 position 对象
    const positionWithPrice = {
      ...position,
      current_price: pnlData?.real_price || undefined
    };
    
    setSellDialog({
      open: true,
      position: positionWithPrice,
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

  // 处理卖出
  const handleSell = async (data: ClosePositionRequest) => {
    try {
      console.log('Selling position:', data);
      await db.closePosition(data);
      
      // 关闭对话框
      setSellDialog({ open: false, position: null });
      
      // 刷新列表
      await refreshPositions();
      
      // 通知父组件数据变化
      onDataChange?.();
      
      alert('卖出成功！');
    } catch (err) {
      console.error('Failed to sell position:', err);
      alert('卖出失败: ' + (err instanceof Error ? err.message : '未知错误'));
      throw err; // 让表单知道失败了
    }
  };

  // 打开减仓对话框
  const handleOpenReduceDialog = (position: Position) => {
    console.log('Opening reduce dialog for position:', position);
    
    // 获取该持仓的实时价格
    const pnlData = positionPnLMap.get(position.id);
    
    // 将当前价格附加到 position 对象
    const positionWithPrice = {
      ...position,
      current_price: pnlData?.real_price || undefined
    };
    
    setReduceDialog({
      open: true,
      position: positionWithPrice,
    });
  };

  // 减仓操作
  const handleReduce = async (data: ReducePositionRequest) => {
    try {
      console.log('Reducing position:', data);
      await db.reducePosition(data);
      
      // 关闭对话框
      setReduceDialog({ open: false, position: null });
      
      // 刷新列表
      await refreshPositions();
      
      // 通知父组件数据变化
      onDataChange?.();
      
      alert('减仓成功！');
    } catch (err) {
      console.error('Failed to reduce position:', err);
      alert('减仓失败: ' + (err instanceof Error ? err.message : '未知错误'));
      throw err; // 让表单知道失败了
    }
  };

  // 删除确认对话框的确认按钮处理
  const handleConfirm = async () => {
    if (!confirmDialog.positionId) return;

    try {
      if (confirmDialog.type === 'delete') {
        console.log('Executing delete position for:', confirmDialog.positionId);
        await deletePosition(confirmDialog.positionId);
        
        // 通知父组件数据变化
        onDataChange?.();
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
      
      // 通知父组件数据变化
      onDataChange?.();
      
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
                    onClick={() => handleOpenSellDialog(position)}
                  ><ArrowDownLeft className="h-4 w-4 mr-1" />平仓</Button><Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenReduceDialog(position)}
                  ><TrendingDown className="h-4 w-4 mr-1" />减仓</Button><Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeletePosition(position.id)}
                  ><Trash2 className="h-4 w-4 mr-1" />删除</Button></div></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={confirmDialog.open}
        title="确认删除"
        description="确认要删除此持仓记录吗？该操作无法撤销。"
        confirmText="删除"
        isDangerous={true}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      {/* 卖出表单对话框 */}
      {sellDialog.open && sellDialog.position && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <SellPositionForm
              position={sellDialog.position}
              onSell={handleSell}
              onCancel={() => setSellDialog({ open: false, position: null })}
            />
          </div>
        </div>
      )}

      {/* 减仓表单对话框 */}
      {reduceDialog.open && reduceDialog.position && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <ReducePositionForm
              position={reduceDialog.position}
              onReduce={handleReduce}
              onCancel={() => setReduceDialog({ open: false, position: null })}
            />
          </div>
        </div>
      )}
    </>
  );
} 