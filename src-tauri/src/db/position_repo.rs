/// 持仓数据访问层
/// 负责所有数据库操作，包括 CRUD 和查询

use rusqlite::{Connection, params, OptionalExtension};
use crate::{db_error, error::{AppError, Result}};
use crate::models::position::{Position, PositionQuery, PortfolioSummary};

/// 持仓数据仓库
pub struct PositionRepository;

impl PositionRepository {
    /// 保存新的持仓记录
    pub fn create(conn: &Connection, position: &Position) -> Result<String> {
        // 验证数据
        position.validate()?;

        let affected_rows = conn.execute(
            "INSERT INTO positions (
                id, code, name, buy_price, buy_date, quantity, status, portfolio
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                &position.id,
                &position.code,
                &position.name,
                position.buy_price,
                &position.buy_date,
                position.quantity,
                &position.status,
                &position.portfolio,
            ],
        )?;

        if affected_rows == 0 {
            return Err(db_error!("创建持仓记录失败"));
        }

        Ok(position.id.clone())
    }

    /// 批量创建持仓记录
    pub fn create_batch(conn: &Connection, positions: &[Position]) -> Result<usize> {
        let mut affected_rows = 0;

        for position in positions {
            Self::create(conn, position)?;
            affected_rows += 1;
        }

        Ok(affected_rows)
    }

    /// 根据 ID 查找持仓记录
    pub fn find_by_id(conn: &Connection, id: &str) -> Result<Option<Position>> {
        let mut stmt = conn.prepare(
            "SELECT id, code, name, buy_price, buy_date, quantity, status, portfolio
             FROM positions
             WHERE id = ?"
        )?;

        let position = stmt.query_row(
            [id],
            |row| Ok(Position {
                id: row.get(0)?,
                code: row.get(1)?,
                name: row.get(2)?,
                buy_price: row.get(3)?,
                buy_date: row.get(4)?,
                quantity: row.get(5)?,
                status: row.get(6)?,
                portfolio: row.get(7)?,
            }),
        ).optional()?;

        Ok(position)
    }

    /// 更新持仓状态
    pub fn update_status(conn: &Connection, id: &str, status: &str) -> Result<bool> {
        let affected_rows = conn.execute(
            "UPDATE positions SET status = ? WHERE id = ?",
            params![status, id],
        )?;

        Ok(affected_rows > 0)
    }

    /// 删除持仓记录
    pub fn delete(conn: &Connection, id: &str) -> Result<bool> {
        let affected_rows = conn.execute("DELETE FROM positions WHERE id = ?", [id])?;
        Ok(affected_rows > 0)
    }

    /// 平仓操作（更新状态为 CLOSE）
    pub fn close_position(conn: &Connection, id: &str) -> Result<()> {
        Self::update_status(conn, id, "CLOSE")?;
        Ok(())
    }

    /// 根据查询条件查询持仓
    pub fn find_by_query(conn: &Connection, query: &PositionQuery) -> Result<Vec<Position>> {
        let (where_clause, params) = query.build_where_clause();

        let sql = format!(
            "SELECT id, code, name, buy_price, buy_date, quantity, status, portfolio
             FROM positions
             {}
             ORDER BY buy_date DESC",
            where_clause
        );

        let mut stmt = conn.prepare(&sql)?;

        // 转换参数为引用数组
        let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p as &dyn rusqlite::ToSql).collect();

        let positions = stmt.query_map(param_refs.as_slice(), |row| {
            Ok(Position {
                id: row.get(0)?,
                code: row.get(1)?,
                name: row.get(2)?,
                buy_price: row.get(3)?,
                buy_date: row.get(4)?,
                quantity: row.get(5)?,
                status: row.get(6)?,
                portfolio: row.get(7)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<Position>>>()?;

        Ok(positions)
    }

    /// 获取所有持仓记录
    pub fn find_all(conn: &Connection) -> Result<Vec<Position>> {
        let query = PositionQuery::new();
        Self::find_by_query(conn, &query)
    }

    /// 获取所有持仓中的记录（status = 'POSITION'）
    pub fn find_positions(conn: &Connection) -> Result<Vec<Position>> {
        let mut query = PositionQuery::new();
        query.status = Some("POSITION".to_string());
        Self::find_by_query(conn, &query)
    }

    /// 获取指定代码的所有记录
    pub fn find_by_code(conn: &Connection, code: &str) -> Result<Vec<Position>> {
        let mut query = PositionQuery::new();
        query.code = Some(code.to_string());
        Self::find_by_query(conn, &query)
    }

    /// 获取指定组合的所有记录
    pub fn find_by_portfolio(conn: &Connection, portfolio: &str) -> Result<Vec<Position>> {
        let mut query = PositionQuery::new();
        query.portfolio = Some(portfolio.to_string());
        Self::find_by_query(conn, &query)
    }

    /// 获取指定组合中的所有持仓记录（仅状态为 POSITION 的）
    pub fn get_portfolio_positions(conn: &Connection, portfolio: &str) -> Result<Vec<Position>> {
        let mut stmt = conn.prepare(
            "SELECT id, code, name, buy_price, buy_date, quantity, status, portfolio
             FROM positions
             WHERE portfolio = ? AND status = 'POSITION'
             ORDER BY code, buy_date DESC"
        )?;

        let positions = stmt.query_map([portfolio], |row| {
            Ok(Position {
                id: row.get(0)?,
                code: row.get(1)?,
                name: row.get(2)?,
                buy_price: row.get(3)?,
                buy_date: row.get(4)?,
                quantity: row.get(5)?,
                status: row.get(6)?,
                portfolio: row.get(7)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<Position>>>()?;

        Ok(positions)
    }

    /// 获取指定股票的所有持仓记录（包括历史记录）
    pub fn get_position_records(conn: &Connection, code: &str) -> Result<Vec<Position>> {
        Self::find_by_code(conn, code)
    }

    /// 获取所有持仓中的代码列表（去重）
    pub fn get_distinct_codes_in_position(conn: &Connection) -> Result<Vec<String>> {
        let mut stmt = conn.prepare(
            "SELECT DISTINCT code FROM positions WHERE status = 'POSITION' ORDER BY code"
        )?;

        let codes = stmt.query_map([], |row| {
            Ok(row.get::<_, String>(0)?)
        })?
        .collect::<rusqlite::Result<Vec<String>>>()?;

        Ok(codes)
    }

    /// 获取所有投资组合列表（去重）
    pub fn get_distinct_portfolios(conn: &Connection) -> Result<Vec<String>> {
        let mut stmt = conn.prepare(
            "SELECT DISTINCT portfolio FROM positions WHERE portfolio IS NOT NULL AND portfolio != '' ORDER BY portfolio"
        )?;

        let portfolios = stmt.query_map([], |row| {
            Ok(row.get::<_, String>(0)?)
        })?
        .collect::<rusqlite::Result<Vec<String>>>()?;

        Ok(portfolios)
    }

    /// 获取指定代码的持仓统计信息
    pub fn get_position_stats_by_code(conn: &Connection, code: &str) -> Result<PositionStats> {
        let mut stmt = conn.prepare(
            "SELECT
                COUNT(*) as record_count,
                SUM(quantity) as total_quantity,
                SUM(quantity * buy_price) as total_cost
             FROM positions
             WHERE code = ? AND status = 'POSITION'"
        )?;

        let stats = stmt.query_row(
            [code],
            |row| Ok(PositionStats {
                record_count: row.get(0)?,
                total_quantity: row.get::<_, i32>(1)?,
                total_cost: row.get::<_, f64>(2)?,
                avg_cost_price: 0.0, // 稍后计算
            })
        )?;

        // 计算平均成本价
        let avg_cost_price = if stats.total_quantity > 0 {
            stats.total_cost / stats.total_quantity as f64
        } else {
            0.0
        };

        Ok(PositionStats {
            avg_cost_price,
            ..stats
        })
    }

    /// 获取投资组合汇总
    pub fn get_portfolio_summary(conn: &Connection, portfolio: &str) -> Result<PortfolioSummary> {
        let positions = Self::find_by_portfolio(conn, portfolio)?;
        PortfolioSummary::new(portfolio.to_string(), positions)
    }

    /// 获取所有投资组合汇总
    pub fn get_all_portfolio_summaries(conn: &Connection) -> Result<Vec<PortfolioSummary>> {
        let portfolios = Self::get_distinct_portfolios(conn)?;

        let mut summaries = Vec::new();
        for portfolio in portfolios {
            summaries.push(Self::get_portfolio_summary(conn, &portfolio)?);
        }

        Ok(summaries)
    }

    /// 检查记录是否存在
    pub fn exists(conn: &Connection, id: &str) -> Result<bool> {
        let count: i32 = conn.query_row("SELECT COUNT(*) FROM positions WHERE id = ?", [id], |row| row.get(0))?;
        Ok(count > 0)
    }

    /// 计算持仓数量
    pub fn count_positions(conn: &Connection) -> Result<i32> {
        let count: i32 = conn.query_row("SELECT COUNT(*) FROM positions WHERE status = 'POSITION'", [], |row| row.get(0))?;
        Ok(count)
    }

    /// 计算所有记录数量
    pub fn count_all(conn: &Connection) -> Result<i32> {
        let count: i32 = conn.query_row("SELECT COUNT(*) FROM positions", [], |row| row.get(0))?;
        Ok(count)
    }
}

/// 持仓统计信息
#[derive(Debug, serde::Serialize)]
pub struct PositionStats {
    /// 记录数量
    pub record_count: i32,
    /// 总数量
    pub total_quantity: i32,
    /// 总成本
    pub total_cost: f64,
    /// 平均成本价
    pub avg_cost_price: f64,
}

impl PositionStats {
    /// 计算平均成本价
    pub fn avg_cost_price(&self) -> f64 {
        if self.total_quantity > 0 {
            self.total_cost / self.total_quantity as f64
        } else {
            0.0
        }
    }

    /// 计算盈亏（需要传入实时价格）
    pub fn calculate_pnl(&self, current_price: f64) -> PnL {
        let current_value = self.total_quantity as f64 * current_price;
        let pnl = current_value - self.total_cost;
        let pnl_percentage = if self.total_cost > 0.0 {
            pnl / self.total_cost * 100.0
        } else {
            0.0
        };

        PnL {
            current_value,
            pnl,
            pnl_percentage,
        }
    }
}

/// 盈亏信息
#[derive(Debug, serde::Serialize)]
pub struct PnL {
    /// 当前价值
    pub current_value: f64,
    /// 盈亏金额
    pub pnl: f64,
    /// 盈亏率（百分比）
    pub pnl_percentage: f64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::position::CreatePositionRequest;

    #[test]
    fn test_new_apis() {
        let _ = std::fs::remove_file("test_new_apis.db");
        let conn = Connection::open("test_new_apis.db").unwrap();

        // 创建表结构
        conn.execute(
            "CREATE TABLE positions (
                id TEXT PRIMARY KEY,
                code TEXT NOT NULL,
                name TEXT NOT NULL,
                buy_price REAL NOT NULL,
                buy_date TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'POSITION',
                portfolio TEXT
            )",
            [],
        ).unwrap();

        // 创建测试数据
        let position1 = Position::from(CreatePositionRequest {
            code: "600519".to_string(),
            name: "贵州茅台".to_string(),
            buy_price: 1680.5,
            buy_date: "2025-01-01".to_string(),
            quantity: 100,
            portfolio: "股票组合".to_string(),
        });

        let position2 = Position::from(CreatePositionRequest {
            code: "000001".to_string(),
            name: "平安银行".to_string(),
            buy_price: 12.5,
            buy_date: "2025-01-02".to_string(),
            quantity: 1000,
            portfolio: "股票组合".to_string(),
        });

        let position3 = Position::from(CreatePositionRequest {
            code: "600519".to_string(),
            name: "贵州茅台".to_string(),
            buy_price: 1700.0,
            buy_date: "2025-01-03".to_string(),
            quantity: 50,
            portfolio: "股票组合".to_string(),
        });

        // 保存测试数据
        PositionRepository::create(&conn, &position1).unwrap();
        PositionRepository::create(&conn, &position2).unwrap();
        PositionRepository::create(&conn, &position3).unwrap();

        // 测试获取所有投资组合列表
        let portfolios = PositionRepository::get_distinct_portfolios(&conn).unwrap();
        assert_eq!(portfolios.len(), 1);
        assert_eq!(portfolios[0], "股票组合");

        // 测试获取指定投资组合中的所有持仓
        let portfolio_positions = PositionRepository::get_portfolio_positions(&conn, "股票组合").unwrap();
        assert_eq!(portfolio_positions.len(), 3);

        // 验证结果按 code 和 buy_date 排序
        assert_eq!(portfolio_positions[0].code, "000001");
        assert_eq!(portfolio_positions[1].code, "600519");
        assert_eq!(portfolio_positions[2].code, "600519");

        // 清理
        let _ = std::fs::remove_file("test_new_apis.db");
    }
}