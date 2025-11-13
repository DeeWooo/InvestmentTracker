/// 持仓记录数据模型
/// 对应 Java 版本的 PositionEntity，共 8 个字段

use serde::{Deserialize, Serialize};
use crate::{invalid_input, error::{AppError, Result}};

/// 数据库中的持仓记录
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Position {
    /// UUID，唯一主键
    pub id: String,
    /// 股票代码
    pub code: String,
    /// 股票名称
    pub name: String,
    /// 买入价格
    pub buy_price: f64,
    /// 买入日期 (YYYY-MM-DD)
    pub buy_date: String,
    /// 买入数量
    pub quantity: i32,
    /// 状态：POSITION 或 CLOSE
    pub status: String,
    /// 所属投资组合
    pub portfolio: String,
    /// 卖出价格（平仓时）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sell_price: Option<f64>,
    /// 卖出日期（平仓时，YYYY-MM-DD）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sell_date: Option<String>,
    /// 父记录ID（减仓时关联原记录）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
}

impl Position {
    /// 创建新的持仓记录
    pub fn new(
        code: String,
        name: String,
        buy_price: f64,
        buy_date: String,
        quantity: i32,
        portfolio: String,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            code,
            name,
            buy_price,
            buy_date,
            quantity,
            status: "POSITION".to_string(),
            portfolio,
            sell_price: None,
            sell_date: None,
            parent_id: None,
        }
    }

    /// 计算已实现盈亏（仅对已平仓记录有效）
    pub fn realized_profit_loss(&self) -> Option<f64> {
        if self.is_closed() {
            self.sell_price.map(|sell_price| {
                (sell_price - self.buy_price) * self.quantity as f64
            })
        } else {
            None
        }
    }

    /// 计算已实现盈亏率（仅对已平仓记录有效）
    pub fn realized_profit_loss_rate(&self) -> Option<f64> {
        if self.is_closed() {
            let cost = self.buy_price * self.quantity as f64;
            self.realized_profit_loss().map(|pnl| {
                if cost != 0.0 {
                    pnl / cost
                } else {
                    0.0
                }
            })
        } else {
            None
        }
    }

    /// 验证数据有效性
    pub fn validate(&self) -> Result<()> {
        if self.code.is_empty() {
            return Err(invalid_input!("股票代码不能为空"));
        }
        if self.name.is_empty() {
            return Err(invalid_input!("股票名称不能为空"));
        }
        if self.buy_price <= 0.0 {
            return Err(invalid_input!("买入价格必须大于0"));
        }
        if self.quantity <= 0 {
            return Err(invalid_input!("买入数量必须大于0"));
        }
        if self.status != "POSITION" && self.status != "CLOSE" {
            return Err(invalid_input!("状态必须是 POSITION 或 CLOSE"));
        }
        Ok(())
    }

    /// 标记为已平仓
    pub fn close(&mut self) {
        self.status = "CLOSE".to_string();
    }

    /// 是否为持仓状态
    pub fn is_position(&self) -> bool {
        self.status == "POSITION"
    }

    /// 是否为已平仓状态
    pub fn is_closed(&self) -> bool {
        self.status == "CLOSE"
    }
}

/// 创建持仓记录的请求参数
#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePositionRequest {
    pub code: String,
    pub name: String,
    pub buy_price: f64,
    pub buy_date: String,
    pub quantity: i32,
    pub portfolio: String,
}

impl From<CreatePositionRequest> for Position {
    fn from(req: CreatePositionRequest) -> Self {
        Self::new(
            req.code.to_lowercase(),  // 统一转为小写
            req.name,
            req.buy_price,
            req.buy_date,
            req.quantity,
            req.portfolio,
        )
    }
}

/// 更新持仓状态的请求参数
#[derive(Debug, Serialize, Deserialize)]
pub struct UpdatePositionStatusRequest {
    pub id: String,
    pub status: String,
}

/// 投资组合汇总信息
#[derive(Debug, Serialize, Deserialize)]
pub struct PortfolioSummary {
    /// 投资组合名称
    pub portfolio: String,
    /// 总成本
    pub total_cost: f64,
    /// 当前价值（前端计算）
    pub total_value: f64,
    /// 总盈亏（前端计算）
    pub pnl: f64,
    /// 盈亏率（前端计算）
    pub pnl_percentage: f64,
    /// 所有持仓记录
    pub positions: Vec<Position>,
}

impl PortfolioSummary {
    pub fn new(portfolio: String, positions: Vec<Position>) -> Result<Self> {
        let total_cost = positions
            .iter()
            .map(|p| p.buy_price * p.quantity as f64)
            .sum();

        Ok(Self {
            portfolio,
            total_cost,
            total_value: 0.0, // 前端计算
            pnl: 0.0,         // 前端计算
            pnl_percentage: 0.0, // 前端计算
            positions,
        })
    }
}

/// 持仓查询条件
#[derive(Debug, Serialize, Deserialize)]
pub struct PositionQuery {
    /// 按代码查询
    pub code: Option<String>,
    /// 按组合查询
    pub portfolio: Option<String>,
    /// 按状态查询
    pub status: Option<String>,
    /// 分页偏移
    pub offset: Option<i32>,
    /// 分页大小
    pub limit: Option<i32>,
}

impl PositionQuery {
    pub fn new() -> Self {
        Self {
            code: None,
            portfolio: None,
            status: None,
            offset: None,
            limit: None,
        }
    }

    /// 构建查询 SQL
    pub fn build_where_clause(&self) -> (String, Vec<rusqlite::types::Value>) {
        let mut conditions = Vec::new();
        let mut params = Vec::new();

        if let Some(code) = &self.code {
            conditions.push("code = ?".to_string());
            params.push(code.clone().into());
        }

        if let Some(portfolio) = &self.portfolio {
            conditions.push("portfolio = ?".to_string());
            params.push(portfolio.clone().into());
        }

        if let Some(status) = &self.status {
            conditions.push("status = ?".to_string());
            params.push(status.clone().into());
        }

        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        (where_clause, params)
    }
}

/// 已平仓交易统计总览
#[derive(Debug, Serialize, Deserialize)]
pub struct ClosedTradesSummary {
    /// 已平仓交易列表（按卖出时间倒序）
    pub trades: Vec<ClosedTrade>,
    /// 总统计
    pub statistics: ClosedTradesStatistics,
}

/// 单笔已平仓交易
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClosedTrade {
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
    /// 卖出日期
    pub sell_date: String,
    /// 卖出价格
    pub sell_price: f64,
    /// 数量
    pub quantity: i32,
    /// 盈亏金额
    pub profit_loss: f64,
    /// 盈亏率
    pub profit_loss_rate: f64,
    /// 所属投资组合
    pub portfolio: String,
    /// 持有天数
    pub holding_days: i32,
}

impl From<Position> for ClosedTrade {
    fn from(pos: Position) -> Self {
        let sell_price = pos.sell_price.unwrap_or(0.0);
        let sell_date = pos.sell_date.unwrap_or_default();
        let cost = pos.buy_price * pos.quantity as f64;
        let profit_loss = (sell_price - pos.buy_price) * pos.quantity as f64;
        let profit_loss_rate = if cost != 0.0 { profit_loss / cost } else { 0.0 };

        // 计算持有天数
        let holding_days = calculate_holding_days(&pos.buy_date, &sell_date);

        Self {
            id: pos.id,
            code: pos.code,
            name: pos.name,
            buy_date: pos.buy_date,
            buy_price: pos.buy_price,
            sell_date,
            sell_price,
            quantity: pos.quantity,
            profit_loss,
            profit_loss_rate,
            portfolio: pos.portfolio,
            holding_days,
        }
    }
}

/// 已平仓交易总统计
#[derive(Debug, Serialize, Deserialize)]
pub struct ClosedTradesStatistics {
    /// 总交易笔数
    pub total_trades: usize,
    /// 盈利笔数
    pub profitable_trades: usize,
    /// 亏损笔数
    pub loss_trades: usize,
    /// 成功率（盈利笔数 / 总笔数）
    pub win_rate: f64,
    /// 总盈亏金额
    pub total_profit_loss: f64,
    /// 平均盈亏率
    pub average_profit_loss_rate: f64,
    /// 最大盈利
    pub max_profit: f64,
    /// 最大亏损
    pub max_loss: f64,
    /// 平均持有天数
    pub average_holding_days: f64,
}

/// 计算持有天数
fn calculate_holding_days(buy_date: &str, sell_date: &str) -> i32 {
    use chrono::NaiveDate;

    let buy = NaiveDate::parse_from_str(buy_date, "%Y-%m-%d").ok();
    let sell = NaiveDate::parse_from_str(sell_date, "%Y-%m-%d").ok();

    match (buy, sell) {
        (Some(b), Some(s)) => {
            let duration = s.signed_duration_since(b);
            duration.num_days() as i32
        }
        _ => 0,
    }
}