/// 持仓相关的 Tauri 命令
/// 处理前端调用，调用数据访问层

use crate::{not_found, error::{AppError, Result}};
use crate::db::position_repo::PositionRepository;
use crate::db::{QuoteService, PortfolioService};
use crate::models::position::{Position, CreatePositionRequest, PortfolioSummary};
use crate::models::{PortfolioProfitLoss};
use rusqlite::Connection;
use std::path::PathBuf;

/// 获取数据库路径
fn get_db_path() -> PathBuf {
    // 优先使用 Tauri 应用数据目录，如果不可用则使用相对路径
    #[cfg(debug_assertions)]
    {
        // 开发环境下使用相对路径
        PathBuf::from("positions.db")
    }
    #[cfg(not(debug_assertions))]
    {
        // 生产环境下使用应用数据目录
        if let Ok(data_dir) = tauri::api::path::data_dir() {
            data_dir.join("InvestmentTracker").join("positions.db")
        } else {
            PathBuf::from("positions.db")
        }
    }
}

/// 获取数据库连接
fn get_db_connection() -> Result<Connection> {
    let db_path = get_db_path();

    // 确保目录存在
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| AppError::Database(format!("创建数据库目录失败: {}", e)))?;
    }

    // 连接到数据库
    let conn = Connection::open(&db_path)
        .map_err(|e| AppError::Database(format!("连接数据库失败: {}", e)))?;

    // 执行数据库迁移（如果需要）
    crate::migration::migrate_v0_to_v1(&conn)
        .map_err(|e| AppError::Database(format!("数据库迁移失败: {}", e)))?;

    Ok(conn)
}

/// 保存新的持仓记录
#[tauri::command]
pub async fn save_position(request: CreatePositionRequest) -> Result<Position> {
    // 连接到数据库
    let conn = get_db_connection()?;

    // 转换为 Position 模型
    let position = Position::from(request);

    // 验证数据
    position.validate()?;

    // 保存到数据库
    let id = PositionRepository::create(&conn, &position)?;

    // 设置生成的 ID
    let mut saved_position = position;
    saved_position.id = id;

    Ok(saved_position)
}

/// 获取所有持仓记录
#[tauri::command]
pub async fn get_positions() -> Result<Vec<Position>> {
    let conn = get_db_connection()?;
    let positions = PositionRepository::find_positions(&conn)?;
    Ok(positions)
}

/// 获取指定代码的所有记录
#[tauri::command]
pub async fn get_position_records(code: String) -> Result<Vec<Position>> {
    let conn = get_db_connection()?;
    let positions = PositionRepository::find_by_code(&conn, &code)?;
    Ok(positions)
}

/// 获取所有持仓中的代码列表
#[tauri::command]
pub async fn get_codes_in_position() -> Result<Vec<String>> {
    let conn = get_db_connection()?;
    let codes = PositionRepository::get_distinct_codes_in_position(&conn)?;
    Ok(codes)
}

/// 平仓操作（更新状态为 CLOSE）
#[tauri::command]
pub async fn close_position(id: String) -> Result<()> {
    let conn = get_db_connection()?;

    // 检查记录是否存在
    if !PositionRepository::exists(&conn, &id)? {
        return Err(not_found!("找不到 ID 为 {} 的持仓记录", id));
    }

    // 执行平仓
    PositionRepository::close_position(&conn, &id)?;

    Ok(())
}

/// 删除持仓记录
#[tauri::command]
pub async fn delete_position(id: String) -> Result<()> {
    let conn = get_db_connection()?;

    // 检查记录是否存在
    if !PositionRepository::exists(&conn, &id)? {
        return Err(not_found!("找不到 ID 为 {} 的持仓记录", id));
    }

    // 删除记录
    PositionRepository::delete(&conn, &id)?;

    Ok(())
}

/// 获取指定代码的持仓统计信息
#[tauri::command]
pub async fn get_position_stats(code: String) -> Result<crate::db::position_repo::PositionStats> {
    let conn = get_db_connection()?;
    let stats = PositionRepository::get_position_stats_by_code(&conn, &code)?;
    Ok(stats)
}

/// 获取投资组合汇总
#[tauri::command]
pub async fn get_portfolio_summary(portfolio: String) -> Result<PortfolioSummary> {
    let conn = get_db_connection()?;
    let summary = PositionRepository::get_portfolio_summary(&conn, &portfolio)?;
    Ok(summary)
}

/// 获取所有投资���合汇总
#[tauri::command]
pub async fn get_all_portfolio_summaries() -> Result<Vec<PortfolioSummary>> {
    let conn = get_db_connection()?;
    let summaries = PositionRepository::get_all_portfolio_summaries(&conn)?;
    Ok(summaries)
}

/// 获取所有投资组合列表
#[tauri::command]
pub async fn get_portfolios() -> Result<Vec<String>> {
    let conn = get_db_connection()?;
    let portfolios = PositionRepository::get_distinct_portfolios(&conn)?;
    Ok(portfolios)
}

/// 获取指定投资组合中的所有持仓
#[tauri::command]
pub async fn get_portfolio_positions(portfolio: String) -> Result<Vec<Position>> {
    let conn = get_db_connection()?;
    let positions = PositionRepository::get_portfolio_positions(&conn, &portfolio)?;
    Ok(positions)
}

/// 获取数据库连接

/// 重置数据库（仅用于测试）
#[tauri::command]
pub async fn reset_database() -> Result<()> {
    let conn = get_db_connection()?;

    // 删除所有数据
    conn.execute("DELETE FROM positions", [])?;

    // 重置自增序列（如果有的话）
    // SQLite 使用 TEXT 主键，不需要重置序列

    Ok(())
}

/// 获取所有投资组合的完整盈亏视图（带实时价格）
/// 对应 Java 版本的 PortfolioService.show()
#[tauri::command]
pub async fn get_portfolio_profit_loss_view(use_mock: Option<bool>) -> Result<Vec<PortfolioProfitLoss>> {
    let conn = get_db_connection()?;

    // 获取所有未平仓的持仓
    let positions = PositionRepository::find_positions(&conn)?;
    let positions: Vec<Position> = positions.into_iter()
        .filter(|p| p.status == "POSITION")
        .collect();

    // 获取所有需要的股票代码
    let codes: Vec<String> = positions.iter()
        .map(|p| p.code.clone())
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();

    // 获取实时价格
    let quotes = if use_mock.unwrap_or(true) {
        // 使用模拟数据（开发阶段）
        QuoteService::mock_quotes(codes)
    } else {
        // 使用真实API（生产阶段）
        QuoteService::fetch_real_quotes(codes).await?
    };

    // 聚合计算
    let result = PortfolioService::aggregate_positions(positions, &quotes)?;

    Ok(result)
}