/// 实时行情数据模型
/// 对应 Java 版本的 RealQuote

use serde::{Deserialize, Serialize};

/// 实时行情数据
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RealQuote {
    /// 股票代码
    pub code: String,
    /// 股票名称
    pub name: String,
    /// 实时价格
    pub real_price: f64,
}

impl RealQuote {
    pub fn new(code: String, name: String, real_price: f64) -> Self {
        Self {
            code,
            name,
            real_price,
        }
    }
}

/// 单笔交易的盈亏计算结果
/// 对应 Java 版本的 PositionProfitLoss
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PositionProfitLoss {
    /// 交易ID
    pub id: String,
    /// 股票代码
    pub code: String,
    /// 股票名称
    pub name: String,
    /// 买入日期
    pub buy_date: String,
    /// 买入价格
    pub buy_price: f64,
    /// 买入数量
    pub quantity: i32,
    /// 实时价格
    pub real_price: f64,
    /// 持仓成本（买入价格 × 数量）
    pub position_cost: f64,
    /// 盈亏金额（(实时价格 - 买入价格) × 数量）
    pub profit_loss: f64,
    /// 盈亏比（盈亏 / 成本）
    pub profit_loss_rate: f64,
    /// 状态
    pub status: String,
    /// 投资组合
    pub portfolio: String,
}

impl PositionProfitLoss {
    pub fn from_position(position: crate::models::Position, real_price: f64) -> Self {
        let position_cost = position.buy_price * position.quantity as f64;
        let profit_loss = (real_price - position.buy_price) * position.quantity as f64;
        let profit_loss_rate = if position.buy_price != 0.0 {
            (real_price - position.buy_price) / position.buy_price
        } else {
            0.0
        };

        Self {
            id: position.id,
            code: position.code,
            name: position.name,
            buy_date: position.buy_date,
            buy_price: position.buy_price,
            quantity: position.quantity,
            real_price,
            position_cost,
            profit_loss,
            profit_loss_rate,
            status: position.status,
            portfolio: position.portfolio,
        }
    }
}

/// 股票级汇总（某个投资组合中的某支股票）
/// 对应 Java 版本的 TargetProfitLoss
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TargetProfitLoss {
    /// 股票代码
    pub code: String,
    /// 股票名称
    pub name: String,
    /// 实时价格
    pub real_price: f64,
    /// 所有交易记录
    pub position_profit_losses: Vec<PositionProfitLoss>,
    /// 成本仓位占比（总成本 / 满仓金额）
    pub cost_position_rate: f64,
    /// 当前仓位占比（当前价值 / 满仓金额）
    pub current_position_rate: f64,
    /// 该股票总盈亏
    pub target_profit_loss: f64,
    /// 该股票盈亏比
    pub target_profit_loss_rate: f64,
    /// 建议买入点（最近买入价 × 0.9）
    pub recommended_buy_in_point: f64,
    /// 建议卖出点（最近买入价 × 1.1）
    pub recommended_sale_out_point: f64,
}

/// 投资组合级汇总
/// 对应 Java 版本的 PortfolioProfitLoss
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PortfolioProfitLoss {
    /// 投资组合名称
    pub portfolio: String,
    /// 满仓金额
    pub full_position: f64,
    /// 该组合下所有股票的汇总
    pub target_profit_losses: Vec<TargetProfitLoss>,
    /// 总持仓成本
    pub sum_position_cost: f64,
    /// 总盈亏
    pub sum_profit_losses: f64,
    /// 总盈亏比
    pub sum_profit_losses_rate: f64,
}
