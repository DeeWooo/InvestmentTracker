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
        // Tauri 2.x 中简化为使用相对路径，由 Tauri 自动管理
        PathBuf::from("positions.db")
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

/// 获取单只股票的名称和价格（用于表单自动填充）
#[tauri::command]
pub async fn fetch_stock_name(code: String) -> Result<serde_json::Value> {
    // 获取单只股票的实时数据
    match QuoteService::fetch_real_quotes(vec![code.clone()]).await {
        Ok(quotes) => {
            // 查找匹配的价格数据
            if let Some(quote) = quotes.values().next() {
                Ok(serde_json::json!({
                    "code": quote.code.clone(),
                    "name": quote.name.clone(),
                    "price": quote.real_price
                }))
            } else {
                // 获取失败，返回原始代码
                Ok(serde_json::json!({
                    "code": code.clone(),
                    "name": code,
                    "price": null
                }))
            }
        }
        Err(_) => {
            // 获取失败，返回原始代码
            Ok(serde_json::json!({
                "code": code.clone(),
                "name": code,
                "price": null
            }))
        }
    }
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

    // 如果没有持仓，返回空列表
    if positions.is_empty() {
        return Ok(vec![]);
    }

    // 获取所有需要的股票代码
    let codes: Vec<String> = positions.iter()
        .map(|p| p.code.clone())
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();

    println!("📦 获取持仓的股票代码列表 (共{}只):", codes.len());
    for code in &codes {
        println!("   - {}", code);
    }

    // 获取价格 - 智能降级策略
    let quotes = if use_mock.unwrap_or(false) {
        // 强制使用模拟数据
        println!("使用模拟数据（用户指定）");
        QuoteService::mock_quotes(codes)
    } else {
        // 尝试实时价格，失败时自动降级
        println!("尝试获取实时价格...");
        match QuoteService::fetch_real_quotes(codes.clone()).await {
            Ok(mut real_quotes) => {
                println!("实时价格获取成功，共{}只股票", real_quotes.len());
                println!("🔍 获取到的价格数据映射:");
                for (code, quote) in &real_quotes {
                    println!("   {} => {} (¥{})", code, quote.name, quote.real_price);
                }

                // 检查是否所有股票都有价格
                if real_quotes.len() == codes.len() {
                    println!("✅ 所有股票价格获取成功");
                    real_quotes
                } else {
                    println!("⚠️  部分股票价格获取失败");
                    println!("   预期: {}只，实际: {}只", codes.len(), real_quotes.len());

                    // 只为失败的股票生成模拟数据
                    let failed_codes: Vec<String> = codes.iter()
                        .filter(|code| !real_quotes.contains_key(*code))
                        .cloned()
                        .collect();

                    println!("   失败的股票代码:");
                    for code in &failed_codes {
                        println!("     - {}", code);
                    }

                    // 为失败的股票生成模拟数据
                    let mock_quotes = QuoteService::mock_quotes(failed_codes);

                    // 合并真实数据和模拟数据（保留真实数据优先）
                    for (code, mock_quote) in mock_quotes {
                        if !real_quotes.contains_key(&code) {
                            println!("   🔧 为 {} 添加模拟数据", code);
                            real_quotes.insert(code, mock_quote);
                        }
                    }

                    real_quotes
                }
            }
            Err(e) => {
                println!("❌ 实时价格获取失败: {}，降级到模拟数据", e);
                QuoteService::mock_quotes(codes)
            }
        }
    };

    // 聚合计算
    let result = PortfolioService::aggregate_positions(positions, &quotes)?;

    println!("📊 聚合后的投资组合数据:");
    for portfolio in &result {
        println!("  投资组合: {}", portfolio.portfolio);
        for target in &portfolio.target_profit_losses {
            println!("    股票: {} {} (当前价: ¥{})", target.code, target.name, target.real_price);
        }
    }

    Ok(result)
}