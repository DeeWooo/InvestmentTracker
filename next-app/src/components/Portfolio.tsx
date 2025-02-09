import { BuyPositionForm } from './BuyPositionForm';
import { usePortfolio } from '@/hooks/usePortfolio';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function Portfolio() {
  const { data: portfolios, isLoading, error } = usePortfolio();

  if (isLoading) {
    return <div>加载中...</div>;
  }

  if (error) {
    return <div>加载失败，请重试</div>;
  }

  if (!portfolios || portfolios.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">暂无投资组合</p>
        <div className="mt-4">
          <BuyPositionForm onBuy={async () => {}} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        {/* <h1 className="text-2xl font-bold">投资组合</h1> */}
        <BuyPositionForm onBuy={async () => {}} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {portfolios.map((portfolio) => (
          <Card key={portfolio.portfolio} className="w-full">
            <CardHeader className="border-b">
              <CardTitle className="text-lg">投资组合：{portfolio.portfolio}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">

              <div>
                <hr/>
                {/* <div style={{ fontSize: "20px" }}>投资组合：白马成长策略</div> */}
        
                <div className="layui-row">
                  <div className="layui-col-xs6">
                    <div>总持仓成本: 73470.000000</div>
                    <div>单标满仓金额: 50000</div>
                  </div>
                  <div className="layui-col-xs6">
                    <div style={{ color: "green", fontWeight: "bold" }}>总盈亏：-33879.0000</div>
                    <div style={{ color: "green", fontWeight: "bold" }}>总盈亏比: -0.461127</div>
                  </div>
                </div>
                <div>
                  <hr style={{ border: "1px dashed #987cb9", width: "80%", color: "#987cb9" }} />
                  <div className="layui-row">
                    <div className="layui-col-xs2">
                      <div>sz000408</div>
                      <div>藏格矿业(000408)</div>
                      <hr style={{ margin: "auto", color: "#987cb9", border: "1px solid" }} />
                      <div>当前价格</div>
                      <div style={{ fontSize: "20px" }}>32.2400</div>
                    </div>
                    <div className="layui-col-xs2">
                      <div>当前仓位: 0.128960</div>
                      <div>成本仓位: 0.133200</div>
                      <hr style={{ margin: "auto", color: "#987cb9", border: "1px solid" }} />
        
                      <div style={{ color: "green" }}>盈亏: -212.0000</div>
                      <div style={{ color: "green" }}>盈亏比： -0.031832</div>
        
                      <hr style={{ margin: "auto", color: "#987cb9", border: "1px solid" }} />
                      <div>建议买入区间(-10%)&lt;28.485</div>
                      <div>建议卖出区间(10%)&gt;34.815</div>
                    </div>
                    <div>
                      <table className="reversal">
                        <tbody>
                          <tr>
                            <th>买入日期</th>
                            <th>买入价格</th>
                            <th>数量</th>
                            <th>盈亏</th>
                          <th>盈亏比</th>
                        </tr>
        
                        <tr>
                          <td>2022-08-19</td>
                          <td>31.65</td>
                          <td>100</td>
                          <td style={{ color: "red" }}>59.0000</td>
                          <td style={{ color: "red" }}>0.018641</td>
                        </tr>
        
                        <tr>
                          <td>2022-07-27</td>
                          <td>34.95</td>
                          <td>100</td>
                          <td style={{ color: "green" }}>-271.0000</td>
                          <td style={{ color: "green" }}>-0.077539</td>
                        </tr>
                      </tbody></table>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          
          </Card>
        ))}
      </div>
    </div>
  );
} 