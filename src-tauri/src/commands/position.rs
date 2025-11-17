/// 持仓相关的 Tauri 命令
/// 处理前端调用，调用数据访问层

use crate::{not_found, invalid_input, error::{AppError, Result}};
use crate::db::position_repo::PositionRepository;
use crate::db::{QuoteService, PortfolioService, ClosedTradeService};
use crate::models::position::{Position, CreatePositionRequest, PortfolioSummary, ClosedTradesSummary};
use crate::models::{PortfolioProfitLoss};
use rusqlite::{Connection, params};
use std::path::PathBuf;

/// 获取数据库路径
/// 使用平台特定的应用数据目录，确保符合各平台的标准规范
fn get_db_path() -> PathBuf {
    let app_data_dir = if cfg!(windows) {
        // Windows: 使用 %APPDATA%\InvestmentTracker
        // 如果 APPDATA 不存在，回退到 USERPROFILE\AppData\Roaming\InvestmentTracker
        let appdata = std::env::var("APPDATA")
            .or_else(|_| {
                std::env::var("USERPROFILE")
                    .map(|home| format!("{}\\AppData\\Roaming", home))
            })
            .unwrap_or_else(|_| ".".to_string());
        PathBuf::from(appdata).join("InvestmentTracker")
    } else if cfg!(target_os = "macos") {
        // macOS: 使用 ~/Library/Application Support/InvestmentTracker
        // 优先使用 HOME，如果不存在则回退到 USERPROFILE（某些特殊环境可能只有 USERPROFILE）
        let home = std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home)
            .join("Library")
            .join("Application Support")
            .join("InvestmentTracker")
    } else {
        // Linux 和其他 Unix 系统: 使用 ~/.local/share/InvestmentTracker
        let home = std::env::var("HOME")
            .unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home)
            .join(".local")
            .join("share")
            .join("InvestmentTracker")
    };
    
    // 确保目录存在
    if let Err(e) = std::fs::create_dir_all(&app_data_dir) {
        eprintln!("无法创建应用数据目录: {:?}, 错误: {}", app_data_dir, e);
    }
    
    app_data_dir.join("positions.db")
}

/// 获取数据库连接
fn get_db_connection() -> Result<Connection> {
    let db_path = get_db_path();
    println!("[DB Connection] 数据库路径: {:?}", db_path);

    // 确保目录存在
    if let Some(parent) = db_path.parent() {
        println!("[DB Connection] 检查并创建数据库目录: {:?}", parent);
        match std::fs::create_dir_all(parent) {
            Ok(_) => {
                println!("[DB Connection] ✅ 数据库目录创建成功");
            }
            Err(e) => {
                let err_msg = format!("创建数据库目录失败: {:?}, 错误: {}", parent, e);
                eprintln!("[DB Connection] ❌ {}", err_msg);
                return Err(AppError::Database(err_msg));
            }
        }
    } else {
        eprintln!("[DB Connection] ⚠️  无法获取数据库路径的父目录");
    }

    // 连接到数据库
    println!("[DB Connection] 正在连接数据库...");
    let conn = match Connection::open(&db_path) {
        Ok(conn) => {
            println!("[DB Connection] ✅ 数据库连接成功");
            conn
        }
        Err(e) => {
            let err_msg = format!("连接数据库失败: {:?}, 错误: {}", db_path, e);
            eprintln!("[DB Connection] ❌ {}", err_msg);
            return Err(AppError::Database(err_msg));
        }
    };

    // 检查表是否存在
    println!("[DB Connection] 检查表是否存在...");
    let table_exists: bool = match conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='positions'",
        [],
        |row| row.get::<_, i32>(0)
    ) {
        Ok(count) => count > 0,
        Err(e) => {
            eprintln!("[DB Connection] ⚠️  检查表是否存在时出错: {}", e);
            false
        }
    };

    if !table_exists {
        // 如果是全新数据库，先创建新表结构（包含所有最新字段）
        println!("[DB Connection] 表不存在，创建新表结构...");
        match conn.execute(
            "CREATE TABLE positions (
                id TEXT PRIMARY KEY,
                code TEXT NOT NULL,
                name TEXT NOT NULL,
                buy_price REAL NOT NULL,
                buy_date TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'POSITION',
                portfolio TEXT,
                sell_price REAL,
                sell_date TEXT,
                parent_id TEXT
            )",
            [],
        ) {
            Ok(_) => {
                println!("[DB Connection] ✅ 表结构创建成功");
            }
            Err(e) => {
                let err_msg = format!("创建表失败: {}", e);
                eprintln!("[DB Connection] ❌ {}", err_msg);
                return Err(AppError::Database(err_msg));
            }
        }
    } else {
        println!("[DB Connection] 表已存在，跳过表创建");
    }

    // 执行所有数据库迁移（自动处理版本升级）
    // 注意：对于全新数据库，迁移会被跳过；对于已有数据库，迁移会添加缺失的字段
    println!("[DB Connection] 开始执行数据库迁移...");
    match crate::migration::run_migrations(&conn) {
        Ok(_) => {
            println!("[DB Connection] ✅ 数据库迁移完成");
        }
        Err(e) => {
            let err_msg = format!("数据库迁移失败: {}", e);
            eprintln!("[DB Connection] ❌ {}", err_msg);
            return Err(AppError::Database(err_msg));
        }
    }

    // 创建索引
    println!("[DB Connection] 创建索引...");
    let indexes = vec![
        ("idx_code", "CREATE INDEX IF NOT EXISTS idx_code ON positions(code)"),
        ("idx_status", "CREATE INDEX IF NOT EXISTS idx_status ON positions(status)"),
        ("idx_parent_id", "CREATE INDEX IF NOT EXISTS idx_parent_id ON positions(parent_id)"),
    ];

    for (name, sql) in indexes {
        match conn.execute(sql, []) {
            Ok(_) => {
                println!("[DB Connection] ✅ 索引 {} 创建成功", name);
            }
            Err(e) => {
                let err_msg = format!("创建索引 {} 失败: {}", name, e);
                eprintln!("[DB Connection] ❌ {}", err_msg);
                return Err(AppError::Database(err_msg));
            }
        }
    }

    println!("[DB Connection] ✅ 数据库初始化完成");
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
    println!("[Command] get_positions: 开始获取持仓记录...");
    
    let conn = match get_db_connection() {
        Ok(conn) => {
            println!("[Command] get_positions: 数据库连接成功");
            conn
        }
        Err(e) => {
            eprintln!("[Command] get_positions: 数据库连接失败: {}", e);
            return Err(e);
        }
    };
    
    match PositionRepository::find_positions(&conn) {
        Ok(positions) => {
            println!("[Command] get_positions: 成功获取 {} 条持仓记录", positions.len());
            Ok(positions)
        }
        Err(e) => {
            eprintln!("[Command] get_positions: 查询持仓记录失败: {}", e);
            Err(e)
        }
    }
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

/// 平仓操作（更新状态为 CLOSE，并记录卖出信息）
/// 
/// 参数：
/// - id: 持仓记录ID
/// - sell_price: 卖出价格
/// - sell_date: 卖出日期 (YYYY-MM-DD)
#[tauri::command]
pub async fn close_position(
    id: String,
    sell_price: f64,
    sell_date: String,
) -> Result<()> {
    let conn = get_db_connection()?;

    // 检查记录是否存在
    if !PositionRepository::exists(&conn, &id)? {
        return Err(not_found!("找不到 ID 为 {} 的持仓记录", id));
    }

    // 验证参数
    if sell_price <= 0.0 {
        return Err(invalid_input!("卖出价格必须大于0"));
    }

    // 执行平仓并记录卖出信息
    conn.execute(
        "UPDATE positions SET status = 'CLOSE', sell_price = ?, sell_date = ? WHERE id = ?",
        params![sell_price, sell_date, id],
    )?;

    println!("✅ 平仓成功：ID={}, 卖出价=¥{}, 日期={}", id, sell_price, sell_date);

    Ok(())
}

/// 减仓（部分卖出）
/// 
/// 操作逻辑：
/// 1. 验证减仓数量必须小于持有数量（否则应使用平仓）
/// 2. 创建新的已卖出记录（status=CLOSE，parent_id=原ID）
/// 3. 更新原持仓记录的数量（quantity 减少）
#[tauri::command]
pub async fn reduce_position(
    id: String,
    reduce_quantity: i32,
    sell_price: f64,
    sell_date: String,
) -> Result<()> {
    let conn = get_db_connection()?;

    // 1. 获取原持仓记录
    let position = PositionRepository::find_by_id(&conn, &id)?
        .ok_or_else(|| not_found!("找不到 ID 为 {} 的持仓记录", id))?;

    // 2. 验证状态必须是 POSITION
    if position.status != "POSITION" {
        return Err(invalid_input!("只能对持仓中的记录进行减仓操作"));
    }

    // 3. 验证减仓数量
    if reduce_quantity <= 0 {
        return Err(invalid_input!("减仓数量必须大于0"));
    }
    if reduce_quantity >= position.quantity {
        return Err(invalid_input!(
            "减仓数量({})必须小于持有数量({})，如需全部卖出请使用平仓功能",
            reduce_quantity,
            position.quantity
        ));
    }

    // 4. 验证卖出价格
    if sell_price <= 0.0 {
        return Err(invalid_input!("卖出价格必须大于0"));
    }

    // 5. 生成新记录ID（已卖出部分）
    use std::time::{SystemTime, UNIX_EPOCH};
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let sold_id = format!("{}-sold-{}", id, timestamp);

    // 6. 创建已卖出记录（新记录）
    conn.execute(
        "INSERT INTO positions (id, code, name, quantity, buy_price, buy_date, status, portfolio, sell_price, sell_date, parent_id)
         VALUES (?, ?, ?, ?, ?, ?, 'CLOSE', ?, ?, ?, ?)",
        params![
            sold_id,
            position.code,
            position.name,
            reduce_quantity,
            position.buy_price,
            position.buy_date,
            position.portfolio,
            sell_price,
            sell_date,
            id, // parent_id 指向原记录
        ],
    )?;

    // 7. 更新原持仓数量
    let remaining_quantity = position.quantity - reduce_quantity;
    conn.execute(
        "UPDATE positions SET quantity = ? WHERE id = ?",
        params![remaining_quantity, id],
    )?;

    println!(
        "✅ 减仓成功：ID={}, 卖出{}股@¥{}, 剩余{}股",
        id, reduce_quantity, sell_price, remaining_quantity
    );

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
    println!("[Command] get_portfolio_profit_loss_view: 开始获取投资组合盈亏视图...");
    
    let conn = match get_db_connection() {
        Ok(conn) => {
            println!("[Command] get_portfolio_profit_loss_view: 数据库连接成功");
            conn
        }
        Err(e) => {
            eprintln!("[Command] get_portfolio_profit_loss_view: 数据库连接失败: {}", e);
            return Err(e);
        }
    };

    // 获取所有未平仓的持仓
    println!("[Command] get_portfolio_profit_loss_view: 开始查询持仓记录...");
    let positions = match PositionRepository::find_positions(&conn) {
        Ok(positions) => {
            println!("[Command] get_portfolio_profit_loss_view: 查询到 {} 条持仓记录", positions.len());
            positions
        }
        Err(e) => {
            eprintln!("[Command] get_portfolio_profit_loss_view: 查询持仓记录失败: {}", e);
            return Err(e);
        }
    };
    
    let positions: Vec<Position> = positions.into_iter()
        .filter(|p| p.status == "POSITION")
        .collect();
    
    println!("[Command] get_portfolio_profit_loss_view: 过滤后剩余 {} 条未平仓持仓", positions.len());

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
    println!("[Command] get_portfolio_profit_loss_view: 开始聚合计算...");
    let result = match PortfolioService::aggregate_positions(positions, &quotes) {
        Ok(data) => {
            println!("[Command] get_portfolio_profit_loss_view: 聚合计算成功，共 {} 个投资组合", data.len());
            println!("📊 聚合后的投资组合数据:");
            for portfolio in &data {
                println!("  投资组合: {}", portfolio.portfolio);
                for target in &portfolio.target_profit_losses {
                    println!("    股票: {} {} (当前价: ¥{})", target.code, target.name, target.real_price);
                }
            }
            data
        }
        Err(e) => {
            eprintln!("[Command] get_portfolio_profit_loss_view: 聚合计算失败: {}", e);
            return Err(e);
        }
    };

    println!("[Command] get_portfolio_profit_loss_view: 成功完成");
    Ok(result)
}

/// 获取已平仓交易统计
///
/// 返回：
/// - ClosedTradesSummary: 包含所有已平仓交易列表和总统计
#[tauri::command]
pub async fn get_closed_trades_summary() -> Result<ClosedTradesSummary> {
    println!("⏳ [Command] 开始获取已平仓交易统计...");

    // 连接到数据库
    let conn = get_db_connection()?;

    // 获取已平仓交易统计
    let summary = ClosedTradeService::get_closed_trades_summary(&conn)?;

    println!("✅ [Command] 已平仓交易统计获取成功");
    println!("   - 总交易笔数: {}", summary.statistics.total_trades);
    println!("   - 盈利笔数: {}", summary.statistics.profitable_trades);
    println!("   - 亏损笔数: {}", summary.statistics.loss_trades);
    println!("   - 成功率: {:.2}%", summary.statistics.win_rate * 100.0);
    println!("   - 总盈亏: ¥{:.2}", summary.statistics.total_profit_loss);

    Ok(summary)
}