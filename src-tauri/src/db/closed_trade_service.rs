/// 已平仓交易统计服务
/// 负责查询和统计所有已平仓的交易记录

use crate::models::position::{ClosedTrade, ClosedTradesSummary, ClosedTradesStatistics, Position};
use crate::error::Result;
use rusqlite::Connection;

/// 已平仓交易服务
pub struct ClosedTradeService;

impl ClosedTradeService {
    /// 获取所有已平仓交易及总统计
    pub fn get_closed_trades_summary(conn: &Connection) -> Result<ClosedTradesSummary> {
        println!("[ClosedTradeService] 开始查询已平仓交易...");

        // 查询所有已平仓记录，按卖出时间倒序排列
        let mut stmt = conn.prepare(
            "SELECT id, code, name, buy_price, buy_date, quantity, status, portfolio,
                    sell_price, sell_date, parent_id
             FROM positions
             WHERE status = 'CLOSE'
             ORDER BY sell_date DESC"
        )?;

        let positions = stmt.query_map([], |row| {
            Ok(Position {
                id: row.get(0)?,
                code: row.get(1)?,
                name: row.get(2)?,
                buy_price: row.get(3)?,
                buy_date: row.get(4)?,
                quantity: row.get(5)?,
                status: row.get(6)?,
                portfolio: row.get(7)?,
                sell_price: row.get(8)?,
                sell_date: row.get(9)?,
                parent_id: row.get(10)?,
            })
        })?;

        // 转换为 ClosedTrade 列表
        let mut trades: Vec<ClosedTrade> = positions
            .filter_map(|pos| pos.ok())
            .map(|pos| ClosedTrade::from(pos))
            .collect();

        println!("[ClosedTradeService] 查询到 {} 笔已平仓交易", trades.len());

        // 计算总统计
        let statistics = Self::calculate_statistics(&trades);

        Ok(ClosedTradesSummary {
            trades,
            statistics,
        })
    }

    /// 计算总统计
    fn calculate_statistics(trades: &[ClosedTrade]) -> ClosedTradesStatistics {
        let total_trades = trades.len();

        if total_trades == 0 {
            return ClosedTradesStatistics {
                total_trades: 0,
                profitable_trades: 0,
                loss_trades: 0,
                win_rate: 0.0,
                total_profit_loss: 0.0,
                average_profit_loss_rate: 0.0,
                max_profit: 0.0,
                max_loss: 0.0,
                average_holding_days: 0.0,
            };
        }

        // 统计盈利/亏损笔数
        let profitable_trades = trades.iter().filter(|t| t.profit_loss > 0.0).count();
        let loss_trades = trades.iter().filter(|t| t.profit_loss < 0.0).count();

        // 成功率
        let win_rate = if total_trades > 0 {
            profitable_trades as f64 / total_trades as f64
        } else {
            0.0
        };

        // 总盈亏
        let total_profit_loss: f64 = trades.iter().map(|t| t.profit_loss).sum();

        // 平均盈亏率
        let total_rate: f64 = trades.iter().map(|t| t.profit_loss_rate).sum();
        let average_profit_loss_rate = if total_trades > 0 {
            total_rate / total_trades as f64
        } else {
            0.0
        };

        // 最大盈利/亏损
        let max_profit = trades
            .iter()
            .map(|t| t.profit_loss)
            .fold(f64::NEG_INFINITY, f64::max);

        let max_loss = trades
            .iter()
            .map(|t| t.profit_loss)
            .fold(f64::INFINITY, f64::min);

        // 平均持有天数
        let total_days: i32 = trades.iter().map(|t| t.holding_days).sum();
        let average_holding_days = if total_trades > 0 {
            total_days as f64 / total_trades as f64
        } else {
            0.0
        };

        println!("[Statistics] 总计: {} 笔, 盈利: {} 笔, 亏损: {} 笔",
                 total_trades, profitable_trades, loss_trades);
        println!("[Statistics] 成功率: {:.2}%, 总盈亏: ¥{:.2}",
                 win_rate * 100.0, total_profit_loss);

        ClosedTradesStatistics {
            total_trades,
            profitable_trades,
            loss_trades,
            win_rate,
            total_profit_loss,
            average_profit_loss_rate,
            max_profit,
            max_loss,
            average_holding_days,
        }
    }
}
