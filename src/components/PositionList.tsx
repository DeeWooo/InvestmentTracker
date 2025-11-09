import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useState } from 'react';
import { Trash2, ArrowDownLeft, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePositions } from '@/hooks/usePositions';
import { Spinner } from '@/components/ui/spinner';
import { BuyPositionForm } from './BuyPositionForm';
import { CreatePositionRequest } from '@/lib/types';

export default function PositionList() {
  const [searchQuery, setSearchQuery] = useState('');
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

  const filteredPositions = positions?.filter(
    (position) =>
      position?.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      position?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? [];

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
          {filteredPositions.map((position) => (
            <TableRow key={position.id}><TableCell>{position.code}</TableCell><TableCell>{position.name}</TableCell><TableCell>待计算</TableCell><TableCell>待计算</TableCell><TableCell>{position.quantity}</TableCell><TableCell>待获取</TableCell><TableCell>{position.buy_price.toFixed(4)}</TableCell><TableCell>{(position.buy_price * 1.1).toFixed(4)}</TableCell><TableCell>{(position.buy_price * 1.2).toFixed(4)}</TableCell><TableCell>{position.buy_date}</TableCell><TableCell>{position.portfolio}</TableCell><TableCell><div className="flex gap-2"><Button
                    variant="outline"
                    size="sm"
                    onClick={() => closePosition(position.id)}
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
                    onClick={() => deletePosition(position.id)}
                  ><Trash2 className="h-4 w-4 mr-1" />删除</Button></div></TableCell></TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
} 