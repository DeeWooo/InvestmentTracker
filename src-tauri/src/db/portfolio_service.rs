/// 投资组合聚合服务
/// 对应 Java 版本的 PortfolioService
/// 负责将持仓数据聚合为投资组合视图

use crate::models::{Position, PositionProfitLoss, TargetProfitLoss, PortfolioProfitLoss, RealQuote};
use crate::error::Result;
use std::collections::HashMap;

/// 满仓金额常量（50000）
const FULL_POSITION: f64 = 50000.0;

/// 投资组合聚合服务
pub struct PortfolioService;

impl PortfolioService {
    /// 将持仓列表聚合为投资组合汇总
    ///
    /// 参数：
    /// - positions: 所有持仓记录（未平仓）
    /// - quotes: 实时价格映射表（code -> RealQuote）
    ///
    /// 返回：
    /// - Vec<PortfolioProfitLoss>: 按投资组合分组的汇总数据
    pub fn aggregate_positions(
        positions: Vec<Position>,
        quotes: &HashMap<String, RealQuote>,
    ) -> Result<Vec<PortfolioProfitLoss>> {
        // 按投资组合分组
        let mut portfolio_map: HashMap<String, Vec<Position>> = HashMap::new();

        for position in positions {
            portfolio_map
                .entry(position.portfolio.clone())
                .or_insert_with(Vec::new)
                .push(position);
        }

        // 为每个投资组合生成聚合数据
        let mut result = Vec::new();

        for (portfolio_name, positions_in_portfolio) in portfolio_map {
            // 按股票代码分组
            let mut code_map: HashMap<String, Vec<Position>> = HashMap::new();

            for position in positions_in_portfolio {
                code_map
                    .entry(position.code.clone())
                    .or_insert_with(Vec::new)
                    .push(position);
            }

            // 为每支股票生成TargetProfitLoss
            let mut target_losses = Vec::new();

            for (code, positions_by_code) in code_map {
                if let Some(quote) = quotes.get(&code) {
                    let target = Self::create_target_profit_loss(
                        &code,
                        quote,
                        positions_by_code,
                    )?;
                    target_losses.push(target);
                }
            }

            // 按持仓成本从高到低排序
            target_losses.sort_by(|a, b| {
                b.cost_position_rate.partial_cmp(&a.cost_position_rate)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });

            // 计算投资组合级汇总
            let portfolio_loss = Self::create_portfolio_profit_loss(
                portfolio_name,
                target_losses,
            )?;

            result.push(portfolio_loss);
        }

        Ok(result)
    }

    /// 为单支股票创建TargetProfitLoss
    fn create_target_profit_loss(
        code: &str,
        quote: &RealQuote,
        positions: Vec<Position>,
    ) -> Result<TargetProfitLoss> {
        // 将Position转换为PositionProfitLoss
        let mut position_losses = Vec::new();
        let mut total_cost = 0.0;
        let mut total_quantity: i32 = 0;
        let mut total_profit_loss = 0.0;

        for position in positions {
            let position_loss = PositionProfitLoss::from_position(
                position.clone(),
                quote.real_price,
            );

            total_cost += position_loss.position_cost;
            total_quantity += position.quantity;
            total_profit_loss += position_loss.profit_loss;

            position_losses.push(position_loss);
        }

        // 排序按日期倒序（最新的在前）
        position_losses.sort_by(|a, b| b.buy_date.cmp(&a.buy_date));

        // 计算成本仓位占比
        let cost_position_rate = if FULL_POSITION != 0.0 {
            total_cost / FULL_POSITION
        } else {
            0.0
        };

        // 计算当前仓位占比
        let current_value = quote.real_price * total_quantity as f64;
        let current_position_rate = if FULL_POSITION != 0.0 {
            current_value / FULL_POSITION
        } else {
            0.0
        };

        // 计算盈亏比
        let target_profit_loss_rate = if total_cost != 0.0 {
            total_profit_loss / total_cost
        } else {
            0.0
        };

        // 获取最近一次买入价格（用于建议点）
        let last_buy_price = position_losses
            .first()
            .map(|p| p.buy_price)
            .unwrap_or(0.0);

        let recommended_buy_in_point = last_buy_price * 0.9;
        let recommended_sale_out_point = last_buy_price * 1.1;

        Ok(TargetProfitLoss {
            code: code.to_string(),
            name: quote.name.clone(),
            real_price: quote.real_price,
            position_profit_losses: position_losses,
            cost_position_rate,
            current_position_rate,
            target_profit_loss: total_profit_loss,
            target_profit_loss_rate,
            recommended_buy_in_point,
            recommended_sale_out_point,
        })
    }

    /// 为投资组合创建PortfolioProfitLoss
    fn create_portfolio_profit_loss(
        portfolio: String,
        target_losses: Vec<TargetProfitLoss>,
    ) -> Result<PortfolioProfitLoss> {
        let mut sum_position_cost = 0.0;
        let mut sum_profit_losses = 0.0;

        for target in &target_losses {
            // 成本 = 仓位比 × 满仓金额
            sum_position_cost += target.cost_position_rate * FULL_POSITION;
            sum_profit_losses += target.target_profit_loss;
        }

        let sum_profit_losses_rate = if sum_position_cost != 0.0 {
            sum_profit_losses / sum_position_cost
        } else {
            0.0
        };

        Ok(PortfolioProfitLoss {
            portfolio,
            full_position: FULL_POSITION,
            target_profit_losses: target_losses,
            sum_position_cost,
            sum_profit_losses,
            sum_profit_losses_rate,
        })
    }
}
